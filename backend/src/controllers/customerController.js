'use strict';
const customerService = require('../services/customerService');
const CustomerPumpAccount = require('../models/CustomerPumpAccount');
const Transaction = require('../models/Transaction');
const { createAuditLog } = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const createCustomer = async (req, res, next) => {
  try {
    const result = await customerService.createCustomer({
      ...req.body,
      name: req.body.name || req.body.customerName,
      petrolPumpId: req.petrolPumpId,
      createdBy: req.user._id,
      requestId: req.id,
    });

    const raw = result.profile.toObject ? result.profile.toObject() : { ...result.profile };
    const data = {
      ...raw,
      id: raw._id,
      name: raw.customerName,
    };
    return sendSuccess(res, data, 'Customer created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getCustomers = async (req, res, next) => {
  try {
    const { page, limit, search, isActive, sort } = req.query;
    const result = await customerService.getCustomers({
      petrolPumpId: req.petrolPumpId,
      page,
      limit,
      search,
      isActive,
      sort,
      requestingUser: req.user,
    });
    return sendSuccess(res, result.customers, 'Customers retrieved', 200, result.meta);
  } catch (err) {
    next(err);
  }
};

const getCustomer = async (req, res, next) => {
  try {
    const profile = await CustomerPumpAccount.findById(req.params.id)
      .populate('customerUserId', 'name email phone')
      .populate('userId', 'name email phone')
      .lean();

    if (!profile) return sendError(res, 'Customer not found', 404);

    if (req.user && req.user.role === 'admin') {
      if (String(profile.petrolPumpId) !== String(req.petrolPumpId)) {
        return sendError(res, 'You do not have permission to perform this action', 403);
      }
    }

    const enriched = {
      ...profile,
      name: profile.customerName || profile.customerUserId?.name || profile.userId?.name || profile.customerCode,
      email: profile.customerUserId?.email || profile.userId?.email || '',
    };

    return sendSuccess(res, enriched);
  } catch (err) {
    next(err);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const existing = await CustomerPumpAccount.findById(req.params.id).lean();
    if (!existing) return sendError(res, 'Customer not found', 404);
    if (req.user && req.user.role === 'admin') {
      if (String(existing.petrolPumpId) !== String(req.petrolPumpId)) {
        return sendError(res, 'You do not have permission to perform this action', 403);
      }
    }

    const profile = await customerService.updateCustomer({
      petrolPumpId: req.petrolPumpId,
      profileId: req.params.id,
      updates: req.body,
      updatedBy: req.user._id,
      requestId: req.id,
    });
    return sendSuccess(res, profile, 'Customer updated');
  } catch (err) {
    next(err);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const existing = await CustomerPumpAccount.findById(req.params.id);
    if (!existing) return sendError(res, 'Customer not found', 404);
    if (req.user && req.user.role === 'admin') {
      if (String(existing.petrolPumpId) !== String(req.petrolPumpId)) {
        return sendError(res, 'You do not have permission to perform this action', 403);
      }
    }

    if (existing.currentBalance !== 0) {
      return sendError(res, 'Cannot delete customer account with active non-zero balance', 400);
    }

    // Check if transactions exist for this customer account
    const txCount = await Transaction.countDocuments({ customerId: req.params.id });
    if (txCount > 0) {
      // Soft-close instead of hard delete to preserve financial ledger and reporting integrity
      existing.isActive = false;
      existing.status = 'closed';
      await existing.save();

      await createAuditLog({
        petrolPumpId: existing.petrolPumpId,
        action: 'CUSTOMER_DEACTIVATED',
        actor: req.user._id,
        actorRole: req.user.role,
        targetId: existing._id,
        targetModel: 'CustomerPumpAccount',
        details: { reason: 'Soft-closed due to existing transaction history', customerCode: existing.customerCode },
        requestId: req.id,
      });

      return sendSuccess(res, existing, 'Customer account closed. Historical transaction records preserved.');
    }

    await CustomerPumpAccount.deleteOne({ _id: req.params.id });

    await createAuditLog({
      petrolPumpId: existing.petrolPumpId,
      action: 'CUSTOMER_DELETED',
      actor: req.user._id,
      actorRole: req.user.role,
      targetId: existing._id,
      targetModel: 'CustomerPumpAccount',
      details: { customerCode: existing.customerCode },
      requestId: req.id,
    });

    return sendSuccess(res, null, 'Customer account deleted');
  } catch (err) {
    next(err);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const account = await CustomerPumpAccount.findById(req.customerId)
      .populate('customerUserId', 'name email phone')
      .populate('userId', 'name email phone')
      .populate('petrolPumpId', 'name city province address')
      .lean();

    if (!account) return sendError(res, 'Profile not found', 404);

    const enriched = {
      ...account,
      name: account.customerName || req.user.name,
      email: req.user.email,
    };
    return sendSuccess(res, enriched);
  } catch (err) {
    next(err);
  }
};

const getMySummaryMonthly = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10);
    if (!year || year < 2000 || year > 2100) {
      return sendError(res, 'Invalid year', 400);
    }

    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const transactions = await Transaction.find({
      customerId: req.customerId,
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
      const date = new Date(tx.transactionDate);
      const month = date.getUTCMonth() + 1;
      const bucket = monthlyData[month];

      if (tx.transactionType === 'fuel_sale') {
        bucket.totalFuel += Number(tx.fuelQuantity) || 0;
        bucket.totalSales += Number(tx.totalAmount) || 0;
      }
      bucket.totalPayments += Number(tx.paymentReceived) || 0;
      bucket.closingBalance = Number(tx.updatedBalance) || bucket.closingBalance;
    });

    return sendSuccess(res, Object.values(monthlyData));
  } catch (err) {
    next(err);
  }
};

const getMySummaryYearly = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10);
    if (!year || year < 2000 || year > 2100) {
      return sendError(res, 'Invalid year', 400);
    }

    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const transactions = await Transaction.find({
      customerId: req.customerId,
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

    let totalFuel = 0;
    let totalSales = 0;
    let totalPayments = 0;

    transactions.forEach((tx) => {
      const date = new Date(tx.transactionDate);
      const month = date.getUTCMonth() + 1;
      const bucket = monthlyData[month];

      if (tx.transactionType === 'fuel_sale') {
        const f = Number(tx.fuelQuantity) || 0;
        const s = Number(tx.totalAmount) || 0;
        bucket.totalFuel += f;
        bucket.totalSales += s;
        totalFuel += f;
        totalSales += s;
      }
      const p = Number(tx.paymentReceived) || 0;
      bucket.totalPayments += p;
      totalPayments += p;
      bucket.closingBalance = Number(tx.updatedBalance) || bucket.closingBalance;
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

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getMyProfile,
  getMySummaryMonthly,
  getMySummaryYearly,
};