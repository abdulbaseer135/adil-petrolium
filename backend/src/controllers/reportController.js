'use strict';
const { Packer } = require('docx');
const {
  generateMonthlyExcel,
  generateDailyExcel,
  generateYearlyExcel,
  generateCustomerStatement,
} = require('../services/excelService');
const { generateProfessionalStatement } = require('../services/professionalStatementService');
const { createAuditLog } = require('../services/auditService');
const { sendSuccess } = require('../utils/apiResponse');
const Transaction = require('../models/Transaction');

// ─── JSON report handler ───────────────────────────────────────────────────

const getMonthlyReport = async (req, res, next) => {
  try {
    const year  = parseInt(req.query.year,  10);
    const month = parseInt(req.query.month, 10);

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const transactions = await Transaction.find({
      transactionDate: { $gte: startDate, $lte: endDate },
      isVoided: { $ne: true },
    }).sort({ transactionDate: 1 }).lean();

    const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Build per-month buckets (for monthly page the breakdown is day-by-day)
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

// ─── Excel export handlers (unchanged) ────────────────────────────────────

const exportMonthly = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const workbook = await generateMonthlyExcel(parseInt(year, 10), parseInt(month, 10), req.query.customerId || null);
    const filename = `petro_monthly_${year}_${String(month).padStart(2,'0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
    await createAuditLog({
      action: 'REPORT_EXPORTED', actor: req.user._id,
      actorEmail: req.user.email, actorRole: req.user.role,
      details: { reportType: 'monthly', year, month }, requestId: req.id,
    });
  } catch (err) { next(err); }
};

const exportDaily = async (req, res, next) => {
  try {
    const { date } = req.query;
    const workbook = await generateDailyExcel(date, req.query.customerId || null);
    const filename = `petro_daily_${date}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
    await createAuditLog({
      action: 'REPORT_EXPORTED', actor: req.user._id,
      actorRole: req.user.role, details: { reportType: 'daily', date }, requestId: req.id,
    });
  } catch (err) { next(err); }
};

const exportYearly = async (req, res, next) => {
  try {
    const { year } = req.query;
    const workbook = await generateYearlyExcel(parseInt(year, 10), req.query.customerId || null);
    const filename = `petro_yearly_${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
    await createAuditLog({
      action: 'REPORT_EXPORTED', actor: req.user._id,
      actorRole: req.user.role, details: { reportType: 'yearly', year }, requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
};

const exportMyStatement = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const workbook = await generateCustomerStatement({
      customerId: req.customerId, startDate, endDate,
    });
    const filename = `statement_${req.customerId}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
    await createAuditLog({
      action: 'REPORT_EXPORTED', actor: req.user._id,
      actorRole: req.user.role,
      details: { reportType: 'customer_statement', customerId: req.customerId },
    });
  } catch (err) { next(err); }
};

// ─── Professional Word Document Exports ─────────────────────────────────────

const exportAdminStatementWord = async (req, res, next) => {
  try {
    const { customerId, startDate, endDate } = req.query;
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
      action: 'REPORT_EXPORTED', actor: req.user._id,
      actorEmail: req.user.email, actorRole: req.user.role,
      details: { reportType: 'admin_statement_word', customerId },
      requestId: req.id,
    });
  } catch (err) { next(err); }
};

module.exports = { getMonthlyReport, exportMonthly, exportDaily, exportYearly, exportMyStatement, exportAdminStatementWord };