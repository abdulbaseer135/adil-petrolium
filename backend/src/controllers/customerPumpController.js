'use strict';
const PetrolPump = require('../models/PetrolPump');
const CustomerPumpAccount = require('../models/CustomerPumpAccount');
const Transaction = require('../models/Transaction');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { createAuditLog } = require('../services/auditService');
const { generateCustomerStatement } = require('../services/excelService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const normalizePhone = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '0' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits;
  if (digits.length === 12 && digits.startsWith('92')) return '0' + digits.slice(2);
  if (digits.length === 13 && digits.startsWith('092')) return digits.slice(1);
  if (digits.length === 14 && digits.startsWith('0092')) return '0' + digits.slice(4);
  return digits;
};

// ─── Available Petrol Pumps ──────────────────────────────────
const getAvailablePumps = async (req, res, next) => {
  try {
    const pumps = await PetrolPump.find({ status: { $in: ['approved', 'active'] } })
      .select('name city province address registrationNumber')
      .sort('name')
      .lean();

    return sendSuccess(res, pumps, 'Available petrol pumps retrieved');
  } catch (err) {
    next(err);
  }
};

// ─── Customer's Linked Pumps ─────────────────────────────────
const getMyPumpAccounts = async (req, res, next) => {
  try {
    const accounts = await CustomerPumpAccount.find({
      $or: [
        { customerUserId: req.user._id },
        { userId: req.user._id },
      ],
      isActive: true,
    })
      .populate('petrolPumpId', 'name city province address businessPhone businessEmail status')
      .sort('-updatedAt')
      .lean();

    return sendSuccess(res, accounts, 'Linked petrol pump accounts retrieved');
  } catch (err) {
    next(err);
  }
};

// ─── Link Petrol Pump Account ────────────────────────────────
const linkPumpAccount = async (req, res, next) => {
  try {
    const { petrolPumpId, customerCode, phone } = req.body;

    if (!petrolPumpId || !customerCode) {
      return sendError(res, 'Petrol pump and customer code are required', 400);
    }

    const pump = await PetrolPump.findById(petrolPumpId);
    if (!pump || !['approved', 'active'].includes(pump.status)) {
      return sendError(res, 'Petrol pump not found or not active', 404);
    }

    const account = await CustomerPumpAccount.findOne({
      petrolPumpId: pump._id,
      customerCode: customerCode.trim().toUpperCase(),
    });

    if (!account) {
      return sendError(
        res,
        'No matching customer account found at this petrol pump. Check your customer code with the station manager.',
        404
      );
    }

    // Check if already linked to someone else
    if (account.customerUserId && String(account.customerUserId) !== String(req.user._id)) {
      return sendError(
        res,
        'This pump customer account is already linked to another user account. Contact the petrol pump manager.',
        403
      );
    }

    // Security verification: verify phone
    const inputPhoneNorm = normalizePhone(phone || req.user.phone);
    const accountPhoneNorm = normalizePhone(account.phone);
    const userPhoneNorm = normalizePhone(req.user.phone);

    const isPhoneMatched =
      (accountPhoneNorm && inputPhoneNorm && accountPhoneNorm === inputPhoneNorm) ||
      (accountPhoneNorm && userPhoneNorm && accountPhoneNorm === userPhoneNorm) ||
      (!accountPhoneNorm); // If pump had no phone on file initially, allow link and bind phone

    if (!isPhoneMatched) {
      return sendError(
        res,
        'Phone verification failed. The registered phone number for this account does not match.',
        400
      );
    }

    // Link account to customer user
    account.customerUserId = req.user._id;
    account.userId = req.user._id;
    account.linkedAt = new Date();
    if (!account.phone && (phone || req.user.phone)) {
      account.phone = phone || req.user.phone;
    }
    if (!account.customerName) {
      account.customerName = req.user.name;
    }
    await account.save();

    await createAuditLog({
      petrolPumpId: pump._id,
      action: 'CUSTOMER_ACCOUNT_LINKED',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: 'customer',
      targetId: account._id,
      targetModel: 'CustomerPumpAccount',
      details: {
        customerCode: account.customerCode,
        pumpId: pump._id,
        pumpName: pump.name,
      },
      requestId: req.id,
    });

    logger.info(
      { userId: req.user._id, accountId: account._id, pumpId: pump._id },
      'Customer linked pump account successfully'
    );

    const populated = await CustomerPumpAccount.findById(account._id)
      .populate('petrolPumpId', 'name city province address businessPhone businessEmail status')
      .lean();

    return sendSuccess(res, populated, 'Petrol pump account linked successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Pump Account Details ────────────────────────────────────
const getPumpAccountDetail = async (req, res, next) => {
  try {
    const globalAccount = await CustomerPumpAccount.findById(req.params.pumpAccountId);
    if (!globalAccount) {
      return sendError(res, 'Customer account not found', 404);
    }

    const isOwner =
      (globalAccount.customerUserId && String(globalAccount.customerUserId) === String(req.user._id)) ||
      (globalAccount.userId && String(globalAccount.userId) === String(req.user._id));
    if (!isOwner) {
      return sendError(res, 'You do not have permission to access this petrol pump account', 403);
    }

    const account = await CustomerPumpAccount.findById(req.params.pumpAccountId)
      .populate('petrolPumpId', 'name city province address businessPhone businessEmail status')
      .lean();

    // Recent 5 transactions
    const recentTransactions = await Transaction.find({
      customerId: account._id,
      isVoided: { $ne: true },
    })
      .sort('-transactionDate')
      .limit(5)
      .lean();

    return sendSuccess(res, {
      account,
      pump: account.petrolPumpId,
      recentTransactions,
    }, 'Pump account details retrieved');
  } catch (err) {
    next(err);
  }
};

// ─── Pump Account Transactions ───────────────────────────────
const getPumpAccountTransactions = async (req, res, next) => {
  try {
    const globalAccount = await CustomerPumpAccount.findById(req.params.pumpAccountId);
    if (!globalAccount) {
      return sendError(res, 'Customer account not found', 404);
    }

    const isOwner =
      (globalAccount.customerUserId && String(globalAccount.customerUserId) === String(req.user._id)) ||
      (globalAccount.userId && String(globalAccount.userId) === String(req.user._id));
    if (!isOwner) {
      return sendError(res, 'You do not have permission to access this petrol pump account', 403);
    }

    const account = globalAccount;

    const {
      startDate,
      endDate,
      transactionType,
      fuelType,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      customerId: account._id,
      isVoided: false,
    };

    if (transactionType) query.transactionType = transactionType;
    if (fuelType) query.fuelType = fuelType;

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.transactionDate.$lte = e;
      }
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort('-transactionDate')
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Transaction.countDocuments(query),
    ]);

    return sendSuccess(res, transactions, 'Transactions retrieved', 200, {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Pump Account Monthly Summary ────────────────────────────
const getPumpAccountMonthly = async (req, res, next) => {
  try {
    const account = await CustomerPumpAccount.findOne({
      _id: req.params.pumpAccountId,
      $or: [
        { customerUserId: req.user._id },
        { userId: req.user._id },
      ],
    }).lean();

    if (!account) return sendError(res, 'Account not found', 404);

    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const transactions = await Transaction.find({
      customerId: account._id,
      transactionDate: { $gte: startDate, $lte: endDate },
      isVoided: { $ne: true },
    }).sort({ transactionDate: 1 }).lean();

    const monthlyData = {};
    for (let m = 1; m <= 12; m++) {
      monthlyData[m] = {
        month: m,
        totalFuel: 0,
        totalSales: 0,
        totalPayments: 0,
        closingBalance: 0,
      };
    }

    transactions.forEach((tx) => {
      const d = new Date(tx.transactionDate);
      const m = d.getUTCMonth() + 1;
      const b = monthlyData[m];
      if (tx.transactionType === 'fuel_sale') {
        b.totalFuel += Number(tx.fuelQuantity) || 0;
        b.totalSales += Number(tx.totalAmount) || 0;
      }
      b.totalPayments += Number(tx.paymentReceived) || 0;
      b.closingBalance = Number(tx.updatedBalance) || b.closingBalance;
    });

    return sendSuccess(res, Object.values(monthlyData));
  } catch (err) {
    next(err);
  }
};

// ─── Pump Account Yearly Summary ─────────────────────────────
const getPumpAccountYearly = async (req, res, next) => {
  try {
    const account = await CustomerPumpAccount.findOne({
      _id: req.params.pumpAccountId,
      $or: [
        { customerUserId: req.user._id },
        { userId: req.user._id },
      ],
    }).lean();

    if (!account) return sendError(res, 'Account not found', 404);

    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const transactions = await Transaction.find({
      customerId: account._id,
      transactionDate: { $gte: startDate, $lte: endDate },
      isVoided: { $ne: true },
    }).sort({ transactionDate: 1 }).lean();

    let totalFuel = 0;
    let totalSales = 0;
    let totalPayments = 0;

    const monthlyData = {};
    for (let m = 1; m <= 12; m++) {
      monthlyData[m] = {
        month: m,
        totalFuel: 0,
        totalSales: 0,
        totalPayments: 0,
        closingBalance: 0,
      };
    }

    transactions.forEach((tx) => {
      const d = new Date(tx.transactionDate);
      const m = d.getUTCMonth() + 1;
      const b = monthlyData[m];
      if (tx.transactionType === 'fuel_sale') {
        const f = Number(tx.fuelQuantity) || 0;
        const s = Number(tx.totalAmount) || 0;
        b.totalFuel += f;
        b.totalSales += s;
        totalFuel += f;
        totalSales += s;
      }
      const p = Number(tx.paymentReceived) || 0;
      b.totalPayments += p;
      totalPayments += p;
      b.closingBalance = Number(tx.updatedBalance) || b.closingBalance;
    });

    return sendSuccess(res, {
      year,
      summary: {
        totalFuel,
        totalSales,
        totalPayments,
        closingBalance: transactions.length ? Number(transactions[transactions.length - 1].updatedBalance || 0) : 0,
      },
      breakdown: Object.values(monthlyData),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Statement Download ──────────────────────────────────────
const downloadPumpStatement = async (req, res, next) => {
  try {
    const account = await CustomerPumpAccount.findOne({
      _id: req.params.pumpAccountId,
      $or: [
        { customerUserId: req.user._id },
        { userId: req.user._id },
      ],
    }).populate('petrolPumpId', 'name city').lean();

    if (!account) return sendError(res, 'Account not found', 404);

    const { startDate, endDate } = req.query;
    const workbook = await generateCustomerStatement({
      customerId: account._id,
      startDate,
      endDate,
    });

    const pumpNameClean = (account.petrolPumpId?.name || 'Petrol_Pump').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Statement_${pumpNameClean}_${account.customerCode}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();

    await createAuditLog({
      petrolPumpId: account.petrolPumpId?._id || account.petrolPumpId,
      action: 'REPORT_EXPORTED',
      actor: req.user._id,
      actorRole: req.user.role,
      details: { reportType: 'customer_pump_statement', customerAccountId: account._id },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAvailablePumps,
  getMyPumpAccounts,
  linkPumpAccount,
  getPumpAccountDetail,
  getPumpAccountTransactions,
  getPumpAccountMonthly,
  getPumpAccountYearly,
  downloadPumpStatement,
};
