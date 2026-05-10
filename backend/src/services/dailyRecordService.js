'use strict';

const DailyRecord = require('../models/DailyRecord');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');
const { createAuditLog } = require('./auditService');
const PK_UTC_OFFSET_HOURS = 5;

const parsePkDate = (dateStr) => {
  const [year, month, day] = String(dateStr || '').split('-').map(Number);
  if (!year || !month || !day) throw new AppError('Invalid date format', 400);
  return new Date(Date.UTC(year, month - 1, day, -PK_UTC_OFFSET_HOURS, 0, 0, 0));
};

const getOrCreateDailyRecord = async (dateStr, createdBy) => {
  const date = parsePkDate(dateStr);
  const end = new Date(date);
  end.setUTCHours(end.getUTCHours() + 24);

  const [agg] = await Transaction.aggregate([
    {
      $match: {
        transactionDate: { $gte: date, $lt: end },
        isVoided: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        totalFuelSold: { $sum: { $ifNull: ['$fuelQuantity', 0] } },
        totalSalesAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
        totalPaymentsReceived: { $sum: { $ifNull: ['$paymentReceived', 0] } },
        totalTransactions: { $sum: 1 },
      },
    },
  ]);

  // $set only has aggregated fields — createdBy is NOT here
  const updatePayload = {
    totalFuelSold: agg?.totalFuelSold || 0,
    totalSalesAmount: agg?.totalSalesAmount || 0,
    totalPaymentsReceived: agg?.totalPaymentsReceived || 0,
    totalTransactions: agg?.totalTransactions || 0,
  };

  // $setOnInsert only runs on first creation — safe for createdBy and date
  const record = await DailyRecord.findOneAndUpdate(
    { date },
    {
      $set: updatePayload,
      $setOnInsert: { date, createdBy },
    },
    { new: true, upsert: true, runValidators: true }
  )
    .populate('createdBy', 'name email')
    .populate('lockedBy', 'name email');

  if (!record) throw new AppError('Failed to load daily record after upsert', 500);

  return record;
};

const lockDailyRecord = async ({ recordId, lockedBy, requestId }) => {
  const record = await DailyRecord.findById(recordId);
  if (!record) throw new AppError('Daily record not found', 404);
  if (record.isLocked) throw new AppError('Daily record already locked', 400);

  record.isLocked = true;
  record.lockedBy = lockedBy;
  record.lockedAt = new Date();
  await record.save();

  await createAuditLog({
    action: 'DAILY_RECORD_LOCKED',
    actor: lockedBy,
    target: recordId,
    targetModel: 'DailyRecord',
    details: { date: record.date },
    requestId,
  });

  return record;
};

module.exports = { getOrCreateDailyRecord, lockDailyRecord };