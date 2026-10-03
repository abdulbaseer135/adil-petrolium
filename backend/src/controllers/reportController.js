'use strict';
const { Packer } = require('docx');
const {
  generateMonthlyExcel,
  generateDailyExcel,
  generateEnhancedDailyExcel,
  generateEnhancedMonthlyExcel,
  generateYearlyExcel,
  generateCustomerStatement,
} = require('../services/excelService');
const { generateProfessionalStatement } = require('../services/professionalStatementService');
const { createAuditLog } = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const Transaction = require('../models/Transaction');
const CustomerPumpAccount = require('../models/CustomerPumpAccount');

// ─── JSON monthly report handler ───────────────────────────────────────────

const getMonthlyReport = async (req, res, next) => {
  try {
    const year  = parseInt(req.query.year,  10);
    const month = parseInt(req.query.month, 10);

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const query = {
      transactionDate: { $gte: startDate, $lte: endDate },
      isVoided: { $ne: true },
    };

    if (req.petrolPumpId) {
      query.petrolPumpId = req.petrolPumpId;
    }

    const transactions = await Transaction.find(query).sort({ transactionDate: 1 }).lean();

    const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const dayMap = {};

    transactions.forEach((tx) => {
      const d   = new Date(tx.transactionDate);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD

      if (!dayMap[key]) {
        dayMap[key] = {
          date:             key,
          transactionCount: 0,
          totalFuelSold:    0,
          totalSales:       0,
          totalPayments:    0,
          netChange:        0,
          balance:          0,
        };
      }

      const bucket = dayMap[key];
      bucket.transactionCount += 1;
      bucket.totalFuelSold    += Number(tx.fuelQuantity)     || 0;
      bucket.totalSales       += Number(tx.totalAmount)      || 0;
      bucket.totalPayments    += Number(tx.paymentReceived)  || 0;
      bucket.netChange        += (Number(tx.paymentReceived) || 0) - (Number(tx.totalAmount) || 0);
      bucket.balance           = Number(tx.updatedBalance)   || bucket.balance;
    });

    const breakdown = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    const summary = breakdown.reduce(
      (acc, row) => {
        acc.totalTransactions += row.transactionCount;
        acc.totalFuelSold     += row.totalFuelSold;
        acc.totalSales        += row.totalSales;
        acc.totalPayments     += row.totalPayments;
        acc.netCredit         += row.netChange;
        return acc;
      },
      { totalTransactions: 0, totalFuelSold: 0, totalSales: 0, totalPayments: 0, netCredit: 0 }
    );

    return sendSuccess(res, {
      year,
      month,
      monthLabel: MONTH_LABELS[month - 1],
      summary,
      breakdown,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Excel export handlers ────────────────────────────────────────────────

const exportMonthly = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const workbook = await generateEnhancedMonthlyExcel(
      parseInt(year, 10),
      parseInt(month, 10),
      req.query.customerId || null,
      req.petrolPumpId || null
    );
    const filename = `monthly_report_${year}_${String(month).padStart(2,'0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
    await createAuditLog({
      petrolPumpId: req.petrolPumpId || null,
      action: 'REPORT_EXPORTED',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      details: { reportType: 'monthly', year, month },
      requestId: req.id,
    });
  } catch (err) { next(err); }
};

const exportDaily = async (req, res, next) => {
  try {
    const { date } = req.query;
    const workbook = await generateEnhancedDailyExcel(
      date,
      req.query.customerId || null,
      req.petrolPumpId || null
    );
    const filename = `daily_report_${date}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
    await createAuditLog({
      petrolPumpId: req.petrolPumpId || null,
      action: 'REPORT_EXPORTED',
      actor: req.user._id,
      actorRole: req.user.role,
      details: { reportType: 'daily', date },
      requestId: req.id,
    });
  } catch (err) { next(err); }
};

const exportYearly = async (req, res, next) => {
  try {
    const { year } = req.query;
    const workbook = await generateYearlyExcel(
      parseInt(year, 10),
      req.query.customerId || null,
      req.petrolPumpId || null
    );
    const filename = `yearly_report_${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
    await createAuditLog({
      petrolPumpId: req.petrolPumpId || null,
      action: 'REPORT_EXPORTED',
      actor: req.user._id,
      actorRole: req.user.role,
      details: { reportType: 'yearly', year },
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
};

const exportMyStatement = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const workbook = await generateCustomerStatement({
      customerId: req.customerId,
      startDate,
      endDate,
      petrolPumpId: req.petrolPumpId || null,
    });
    const filename = `statement_${req.customerId}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
    await createAuditLog({
      petrolPumpId: req.petrolPumpId || null,
      action: 'REPORT_EXPORTED',
      actor: req.user._id,
      actorRole: req.user.role,
      details: { reportType: 'customer_statement', customerId: req.customerId },
    });
  } catch (err) { next(err); }
};

const parsePkDateStart = (dateStr) => {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, -5, 0, 0, 0));
};

const parsePkDateEnd = (dateStr) => {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 18, 59, 59, 999));
};

const parsePkYearStart = (year) => new Date(Date.UTC(year, 0, 1, -5, 0, 0, 0));
const parsePkYearEnd = (year) => new Date(Date.UTC(year, 11, 31, 18, 59, 59, 999));

const exportAdminStatementExcel = async (req, res, next) => {
  try {
    const { customerId, startDate, endDate } = req.query;

    if (req.user.role === 'admin') {
      const globalCust = await CustomerPumpAccount.findById(customerId);
      if (!globalCust) return sendError(res, 'Customer not found', 404);
      if (String(globalCust.petrolPumpId) !== String(req.petrolPumpId)) {
        return sendError(res, 'You do not have permission to perform this action', 403);
      }
    }

    const workbook = await generateCustomerStatement({
      customerId,
      startDate,
      endDate,
      petrolPumpId: req.petrolPumpId || null,
    });

    const filename = `statement_${customerId}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();

    await createAuditLog({
      petrolPumpId: req.petrolPumpId || null,
      action: 'REPORT_EXPORTED',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      details: { reportType: 'admin_statement_excel', customerId },
      requestId: req.id,
    });
  } catch (err) { next(err); }
};

const exportAdminStatementWord = async (req, res, next) => {
  try {
    const { customerId, startDate, endDate } = req.query;

    if (req.user.role === 'admin') {
      const globalCust = await CustomerPumpAccount.findById(customerId);
      if (!globalCust) return sendError(res, 'Customer not found', 404);
      if (String(globalCust.petrolPumpId) !== String(req.petrolPumpId)) {
        return sendError(res, 'You do not have permission to perform this action', 403);
      }
    }

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const from = startDate ? parsePkDateStart(startDate) : parsePkYearStart(today.getFullYear());
    const to = endDate ? parsePkDateEnd(endDate) : parsePkDateEnd(todayKey);

    const doc = await generateProfessionalStatement({
      customerId,
      startDate: from,
      endDate: to,
    });

    const filename = `statement_${customerId}_${Date.now()}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await Packer.toStream(doc, res);

    await createAuditLog({
      petrolPumpId: req.petrolPumpId || null,
      action: 'REPORT_EXPORTED',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      details: { reportType: 'admin_statement_word', customerId },
      requestId: req.id,
    });
  } catch (err) { next(err); }
};

module.exports = {
  getMonthlyReport,
  exportMonthly,
  exportDaily,
  exportYearly,
  exportMyStatement,
  exportAdminStatementExcel,
  exportAdminStatementWord,
};