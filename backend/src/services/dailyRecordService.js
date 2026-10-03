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

const getOrCreateDailyRecord = async (dateStr, createdBy, petrolPumpId) => {
  let targetPumpId = petrolPumpId;
  if (!targetPumpId && createdBy) {
    const User = require('../models/User');
    const u = await User.findById(createdBy);
    targetPumpId = u?.petrolPumpId;
  }
  if (!targetPumpId) {
    const PetrolPump = require('../models/PetrolPump');
    const p = await PetrolPump.findOne();
    targetPumpId = p?._id;
  }
  if (!targetPumpId) throw new AppError('Petrol pump ID is required', 400);

  const date = parsePkDate(dateStr);
  const end = new Date(date);
  end.setUTCHours(end.getUTCHours() + 24);

  const [agg] = await Transaction.aggregate([
    {
      $match: {
        petrolPumpId: new (require('mongoose').Types.ObjectId)(targetPumpId),
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

  const updatePayload = {
    totalFuelSold: agg?.totalFuelSold || 0,
    totalSalesAmount: agg?.totalSalesAmount || 0,
    totalPaymentsReceived: agg?.totalPaymentsReceived || 0,
    totalTransactions: agg?.totalTransactions || 0,
  };

  const record = await DailyRecord.findOneAndUpdate(
    { petrolPumpId: targetPumpId, date },
    {
      $set: updatePayload,
      $setOnInsert: { petrolPumpId: targetPumpId, date, createdBy },
    },
    { new: true, upsert: true, runValidators: true }
  )
    .populate('createdBy', 'name email')
    .populate('lockedBy', 'name email');

  if (!record) throw new AppError('Failed to load daily record after upsert', 500);

  return record;
};

const lockDailyRecord = async ({ recordId, lockedBy, petrolPumpId, requestId }) => {
  const query = { _id: recordId };
  if (petrolPumpId) query.petrolPumpId = petrolPumpId;

  const record = await DailyRecord.findOne(query);
  if (!record) throw new AppError('Daily record not found or access denied', 404);
  if (record.isLocked) throw new AppError('Daily record already locked', 400);

  record.isLocked = true;
  record.lockedBy = lockedBy;
  record.lockedAt = new Date();
  await record.save();

  await createAuditLog({
    petrolPumpId: record.petrolPumpId,
    action: 'DAILY_RECORD_LOCKED',
    actor: lockedBy,
    targetId: recordId,
    targetModel: 'DailyRecord',
    targetType: 'DailyRecord',
    details: { date: record.date },
    requestId,
  });

  return record;
};

module.exports = { getOrCreateDailyRecord, lockDailyRecord };