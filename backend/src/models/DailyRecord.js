'use strict';
const mongoose = require('mongoose');

const dailyRecordSchema = new mongoose.Schema({
  date: {
    type: Date, required: true, unique: true,
    comment: 'Stored as midnight UTC for the given date',
  },
  totalFuelSold:      { type: Number, default: 0 },
  totalSalesAmount:   { type: Number, default: 0 },
  totalPaymentsReceived: { type: Number, default: 0 },
  totalTransactions:  { type: Number, default: 0 },
  openingCashBalance: { type: Number, default: 0 },
  closingCashBalance: { type: Number, default: 0 },
  notes:    { type: String },
  isLocked: { type: Boolean, default: false },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockedAt: { type: Date },
  createdBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true, strict: true,
});

dailyRecordSchema.index({ date: -1 });

module.exports = mongoose.model('DailyRecord', dailyRecordSchema);