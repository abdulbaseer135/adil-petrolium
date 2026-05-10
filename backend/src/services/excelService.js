'use strict';

const ExcelJS = require('exceljs');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const CustomerProfile = require('../models/CustomerProfile');

const PK_TIMEZONE = 'Asia/Karachi';

const FUEL_LABELS = { pmg: 'PMG', hsd: 'HSD', nr: 'NR' };
const TYPE_LABELS = {
  fuel_sale: 'Sales',
  payment: 'Receipts',
  adjustment: 'Adjustment',
  credit_note: 'Credit Note',
  opening_balance: 'Opening Balance',
};

const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
const qty = (value) => Number(value || 0).toFixed(2);
const fmtDate = (value) => new Date(value).toLocaleDateString('en-PK', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: PK_TIMEZONE,
});
const fmtDateTime = (value) =>
  new Date(value).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: PK_TIMEZONE,
  });

const parsePkDateStart = (dateStr) => {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  const local = new Date(year, month - 1, day, 0, 0, 0, 0);
  // Pakistan is UTC+5, so midnight PKT = 19:00 UTC previous day
  return new Date(local.getTime() - 5 * 60 * 60 * 1000);
};

const parsePkDateEnd = (dateStr) => {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  const local = new Date(year, month - 1, day, 23, 59, 59, 999);
  return new Date(local.getTime() - 5 * 60 * 60 * 1000);
};

const parsePkMonthStart = (year, month) => {
  const local = new Date(year, month - 1, 1, 0, 0, 0, 0);
  return new Date(local.getTime() - 5 * 60 * 60 * 1000);
};

const parsePkMonthEnd = (year, month) => {
  const local = new Date(year, month, 0, 23, 59, 59, 999);
  return new Date(local.getTime() - 5 * 60 * 60 * 1000);
};

const parsePkYearStart = (year) => {
  const local = new Date(year, 0, 1, 0, 0, 0, 0);
  return new Date(local.getTime() - 5 * 60 * 60 * 1000);
};

const parsePkYearEnd = (year) => {
  const local = new Date(year, 11, 31, 23, 59, 59, 999);
  return new Date(local.getTime() - 5 * 60 * 60 * 1000);
};

const safeSheetName = (value, fallback = 'Sheet') => {
  const cleaned = String(value || fallback)
    .replace(/[\\/\?\*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 31) || fallback;
};

const applyBorder = (row, from = 1, to = 9) => {
  for (let index = from; index <= to; index += 1) {
    row.getCell(index).border = {
      top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    };
  }
};

const buildDetailText = (tx) => {
  if (tx.transactionType === 'fuel_sale') {
    const product = FUEL_LABELS[tx.fuelType] || 'Fuel';
    return `${product} sale${tx.referenceNo ? ` - Ref ${tx.referenceNo}` : ''}${tx.notes ? ` - ${tx.notes}` : ''}`;
  }

  if (tx.transactionType === 'payment') {
    return `Payment received${tx.referenceNo ? ` - Ref ${tx.referenceNo}` : ''}${tx.notes ? ` - ${tx.notes}` : ''}`;
  }

  if (tx.transactionType === 'opening_balance') {
    return `Opening balance${tx.notes ? ` - ${tx.notes}` : ''}`;
  }

  if (tx.transactionType === 'credit_note') {
    return `Credit note${tx.referenceNo ? ` - Ref ${tx.referenceNo}` : ''}${tx.notes ? ` - ${tx.notes}` : ''}`;
  }

  return `${TYPE_LABELS[tx.transactionType] || 'Entry'}${tx.notes ? ` - ${tx.notes}` : ''}`;
};

const createWorkbook = () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Adil Petroleum';
  workbook.created = new Date();
  return workbook;
};

const getCustomerProfile = async (customerId) => {
  if (!customerId) return null;

  return CustomerProfile.findById(customerId)
    .populate('userId', 'name email')
    .lean();
};

const loadTransactions = async ({ startDate, endDate, customerId = null }) => {
  const query = {
    transactionDate: { $gte: startDate, $lte: endDate },
    isVoided: { $ne: true },
  };

  if (customerId) {
    query.customerId = customerId;
  }

  return Transaction.find(query)
    .populate({
      path: 'customerId',
      select: 'customerCode address phone currentBalance',
      populate: { path: 'userId', select: 'name email' },
    })
    .sort({ transactionDate: 1 })
    .lean();
};

const groupTransactions = (transactions) => {
  const groups = new Map();

  transactions.forEach((tx) => {
    const customer = tx.customerId || {};
    const key = String(customer._id || tx.customerId || 'unknown');

    if (!groups.has(key)) {
      groups.set(key, {
        customer,
        transactions: [],
      });
    }

    groups.get(key).transactions.push(tx);
  });

  return [...groups.values()].sort((left, right) => {
    const leftName = left.customer?.userId?.name || left.customer?.customerCode || 'ZZZ';
    const rightName = right.customer?.userId?.name || right.customer?.customerCode || 'ZZZ';
    return leftName.localeCompare(rightName);
  });
};

const summarizeTransactions = (transactions) => {
  const productTotals = { pmg: 0, hsd: 0, nr: 0 };
  let totalDebit = 0;
  let totalCredit = 0;
  let debitCount = 0;
  let creditCount = 0;
  let closingBalance = 0;

  transactions.forEach((tx) => {
    const debit = Number(tx.totalAmount || 0);
    const credit = Number(tx.paymentReceived || 0);
    const balance = Number(tx.updatedBalance || 0);
    const fuelQty = Number(tx.fuelQuantity || 0);

    if (tx.fuelType && productTotals[tx.fuelType] !== undefined) {
      productTotals[tx.fuelType] += fuelQty;
    }

    if (debit > 0) debitCount += 1;
    if (credit > 0) creditCount += 1;

    totalDebit += debit;
    totalCredit += credit;
    closingBalance = balance;
  });

  return {
    productTotals,
    totalDebit,
    totalCredit,
    debitCount,
    creditCount,
    closingBalance,
  };
};

const writeLedgerHeader = ({ worksheet, title, customerName, customerCode, address, contactNo, dateFrom, dateTo, openingBalance }) => {
  worksheet.mergeCells('A1:I1');
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.getCell('A3').value = `Account Name: ${customerName || '-'}`;
  worksheet.getCell('A4').value = `Account Code: ${customerCode || '-'}`;
  worksheet.getCell('A5').value = `Address: ${address || '-'}`;
  worksheet.getCell('A6').value = `Contact No: ${contactNo || '-'}`;

  worksheet.getCell('G3').value = `Date From: ${dateFrom}`;
  worksheet.getCell('G4').value = `Date To: ${dateTo}`;
  worksheet.getCell('G5').value = 'Account Nature: Customer';
  worksheet.getCell('G6').value = `Opening Balance: ${money(openingBalance)}`;

  ['A3', 'A4', 'A5', 'A6', 'G3', 'G4', 'G5', 'G6'].forEach((cellRef) => {
    worksheet.getCell(cellRef).font = { bold: true };
  });

  const headerRow = worksheet.getRow(8);
  headerRow.values = ['Date', 'Bill No', 'Particulars', 'Details', 'Qty', 'Rate', 'Debit', 'Credit', 'Balance'];
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEDEDED' },
  };
  applyBorder(headerRow);
};

const writeLedgerRows = (worksheet, transactions) => {
  transactions.forEach((tx) => {
    const debit = Number(tx.totalAmount || 0);
    const credit = Number(tx.paymentReceived || 0);
    const balance = Number(tx.updatedBalance || 0);
    const fuelQty = Number(tx.fuelQuantity || 0);

    const row = worksheet.addRow([
      fmtDate(tx.transactionDate),
      tx.referenceNo || '-',
      TYPE_LABELS[tx.transactionType] || tx.transactionType,
      buildDetailText(tx),
      fuelQty ? qty(fuelQty) : '',
      tx.rate ? money(tx.rate) : '',
      debit > 0 ? money(debit) : '',
      credit > 0 ? money(credit) : '',
      money(balance),
    ]);

    row.alignment = { vertical: 'middle' };
    applyBorder(row);
  });

  return summarizeTransactions(transactions);
};

const writeLedgerFooter = (worksheet, summary) => {
  const startRow = worksheet.lastRow.number + 2;

  worksheet.getCell(`A${startRow}`).value = 'Product';
  worksheet.getCell(`B${startRow}`).value = 'Sales Qty';
  worksheet.getCell(`E${startRow}`).value = 'Transaction Detail';
  worksheet.getCell(`G${startRow}`).value = "No's";
  worksheet.getCell(`H${startRow}`).value = 'Amount';

  ['A', 'B', 'E', 'G', 'H'].forEach((col) => {
    worksheet.getCell(`${col}${startRow}`).font = { bold: true };
  });

  worksheet.getCell(`A${startRow + 1}`).value = 'PMG';
  worksheet.getCell(`B${startRow + 1}`).value = qty(summary.productTotals.pmg);

  worksheet.getCell(`A${startRow + 2}`).value = 'HSD';
  worksheet.getCell(`B${startRow + 2}`).value = qty(summary.productTotals.hsd);

  worksheet.getCell(`A${startRow + 3}`).value = 'NR';
  worksheet.getCell(`B${startRow + 3}`).value = qty(summary.productTotals.nr);

  worksheet.getCell(`E${startRow + 1}`).value = 'Total Dr. Transactions';
  worksheet.getCell(`G${startRow + 1}`).value = summary.debitCount;
  worksheet.getCell(`H${startRow + 1}`).value = money(summary.totalDebit);

  worksheet.getCell(`E${startRow + 2}`).value = 'Total Cr. Transactions';
  worksheet.getCell(`G${startRow + 2}`).value = summary.creditCount;
  worksheet.getCell(`H${startRow + 2}`).value = money(summary.totalCredit);

  worksheet.getCell(`E${startRow + 3}`).value = 'Closing Balance';
  worksheet.getCell(`H${startRow + 3}`).value = money(summary.closingBalance);
  worksheet.getCell(`H${startRow + 3}`).font = { bold: true, color: { argb: 'FF008000' } };
};

const writeLedgerSheet = async ({ workbook, sheetName, title, periodLabel, customerId = null, transactions }) => {
  const worksheet = workbook.addWorksheet(safeSheetName(sheetName));

  worksheet.columns = [
    { key: 'date', width: 14 },
    { key: 'billNo', width: 18 },
    { key: 'particulars', width: 18 },
    { key: 'details', width: 38 },
    { key: 'qty', width: 12 },
    { key: 'rate', width: 12 },
    { key: 'debit', width: 16 },
    { key: 'credit', width: 16 },
    { key: 'balance', width: 18 },
  ];

  const profile = customerId ? await getCustomerProfile(customerId) : null;
  const firstTx = transactions[0];
  const customerName = profile?.userId?.name || firstTx?.customerId?.userId?.name || 'All Customers';
  const customerCode = profile?.customerCode || firstTx?.customerId?.customerCode || '-';
  const address = profile?.address || firstTx?.customerId?.address || '-';
  const contactNo = profile?.phone || firstTx?.customerId?.phone || '-';
  const openingBalance = transactions[0]?.previousBalance || 0;

  writeLedgerHeader({
    worksheet,
    title,
    customerName,
    customerCode,
    address,
    contactNo,
    dateFrom: periodLabel.from,
    dateTo: periodLabel.to,
    openingBalance,
  });

  const summary = writeLedgerRows(worksheet, transactions);
  if (!transactions.length) {
    worksheet.getCell('A10').value = 'No transactions found for this customer and date range.';
  }
  writeLedgerFooter(worksheet, summary);

  return worksheet;
};

const writeSummarySheet = (workbook, sheetName, title, groups, periodLabel) => {
  const worksheet = workbook.addWorksheet(safeSheetName(sheetName));
  worksheet.columns = [
    { key: 'customer', width: 24 },
    { key: 'code', width: 16 },
    { key: 'entries', width: 12 },
    { key: 'fuel', width: 14 },
    { key: 'sales', width: 16 },
    { key: 'payments', width: 16 },
    { key: 'remaining', width: 18 },
  ];

  worksheet.mergeCells('A1:G1');
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };
  worksheet.getCell('A3').value = `Period: ${periodLabel.from} to ${periodLabel.to}`;
  worksheet.getCell('A3').font = { bold: true };

  const headerRow = worksheet.getRow(5);
  headerRow.values = ['Customer', 'Code', 'Entries', 'Fuel (L)', 'Sales (PKR)', 'Payments (PKR)', 'Remaining (PKR)'];
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEDED' } };
  applyBorder(headerRow, 1, 7);

  let rowIndex = 6;
  const grandTotals = { entries: 0, fuel: 0, sales: 0, payments: 0, remaining: 0 };

  groups.forEach((group) => {
    const customer = group.customer || {};
    const summary = summarizeTransactions(group.transactions);
    const lastBalance = summary.closingBalance;
    const row = worksheet.getRow(rowIndex);
    row.values = [
      customer.userId?.name || '—',
      customer.customerCode || '—',
      group.transactions.length,
      qty(summary.productTotals.pmg + summary.productTotals.hsd + summary.productTotals.nr),
      money(summary.totalDebit),
      money(summary.totalCredit),
      money(lastBalance),
    ];
    applyBorder(row, 1, 7);

    grandTotals.entries += group.transactions.length;
    grandTotals.fuel += summary.productTotals.pmg + summary.productTotals.hsd + summary.productTotals.nr;
    grandTotals.sales += summary.totalDebit;
    grandTotals.payments += summary.totalCredit;
    grandTotals.remaining += lastBalance;

    rowIndex += 1;
  });

  const totalRow = worksheet.getRow(rowIndex + 1);
  totalRow.values = [
    'Grand Total',
    '-',
    grandTotals.entries,
    qty(grandTotals.fuel),
    money(grandTotals.sales),
    money(grandTotals.payments),
    money(grandTotals.remaining),
  ];
  totalRow.font = { bold: true };
  applyBorder(totalRow, 1, 7);
};

const buildStatementWorkbook = async ({ title, periodLabel, startDate, endDate, customerId = null }) => {
  const workbook = createWorkbook();
  const transactions = await loadTransactions({ startDate, endDate, customerId });

  // Debug: log how many transactions were loaded for this export
  try {
    logger.info({ count: Array.isArray(transactions) ? transactions.length : 0, customerId, startDate, endDate }, 'Excel export - transactions loaded');
  } catch (err) {
    // swallow logging errors — do not break export
  }

  if (customerId) {
    await writeLedgerSheet({
      workbook,
      sheetName: 'Statement',
      title,
      periodLabel,
      customerId,
      transactions,
    });
    return workbook;
  }

  const groups = groupTransactions(transactions);
  writeSummarySheet(workbook, 'Summary', `${title} - Summary`, groups, periodLabel);

  for (const group of groups) {
    const customer = group.customer || {};
    const customerTitle = `${title} - ${customer.userId?.name || customer.customerCode || 'Customer'}`;
    await writeLedgerSheet({
      workbook,
      sheetName: customer.customerCode || customer.userId?.name || 'Customer',
      title: customerTitle,
      periodLabel,
      customerId: customer._id,
      transactions: group.transactions,
    });
  }

  return workbook;
};

const generateDailyExcel = async (date, customerId = null) => {
  const startDate = parsePkDateStart(date);
  const endDate = parsePkDateEnd(date);

  return buildStatementWorkbook({
    title: 'DAILY ACCOUNT STATEMENT',
    periodLabel: { from: fmtDate(startDate), to: fmtDate(endDate) },
    startDate,
    endDate,
    customerId,
  });
};

const generateMonthlyExcel = async (year, month, customerId = null) => {
  const startDate = parsePkMonthStart(year, month);
  const endDate = parsePkMonthEnd(year, month);

  return buildStatementWorkbook({
    title: 'MONTHLY ACCOUNT STATEMENT',
    periodLabel: { from: fmtDate(startDate), to: fmtDate(endDate) },
    startDate,
    endDate,
    customerId,
  });
};

const generateYearlyExcel = async (year, customerId = null) => {
  const startDate = parsePkYearStart(year);
  const endDate = parsePkYearEnd(year);

  return buildStatementWorkbook({
    title: 'YEARLY ACCOUNT STATEMENT',
    periodLabel: { from: fmtDate(startDate), to: fmtDate(endDate) },
    startDate,
    endDate,
    customerId,
  });
};

const generateCustomerStatement = async ({ customerId, startDate, endDate }) => {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const from = startDate ? parsePkDateStart(startDate) : parsePkYearStart(today.getFullYear());
  const to = endDate ? parsePkDateEnd(endDate) : parsePkDateEnd(todayKey);

  return buildStatementWorkbook({
    title: 'CUSTOMER STATEMENT',
    periodLabel: { from: fmtDate(from), to: fmtDate(to) },
    startDate: from,
    endDate: to,
    customerId,
  });
};

module.exports = {
  generateDailyExcel,
  generateMonthlyExcel,
  generateYearlyExcel,
  generateCustomerStatement,
  // Internal helpers exported for testing
  parsePkDateStart,
  parsePkDateEnd,
  parsePkMonthStart,
  parsePkMonthEnd,
  parsePkYearStart,
  parsePkYearEnd,
  safeSheetName,
  createWorkbook,
  buildDetailText,
  groupTransactions,
  summarizeTransactions,
};