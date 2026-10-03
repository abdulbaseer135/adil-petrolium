'use strict';
const mongoose = require('mongoose');

const dailyRecordSchema = new mongoose.Schema({
  petrolPumpId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PetrolPump',
    required: [true, 'Petrol pump is required'],
    index: true,
  },
  date: {
    type: Date,
    required: true,
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
  timestamps: true,
  strict: true,
});

// Tenant-scoped uniqueness: one daily record per petrol pump per date
dailyRecordSchema.index({ petrolPumpId: 1, date: 1 }, { unique: true });
dailyRecordSchema.index({ petrolPumpId: 1, isLocked: 1 });

module.exports = mongoose.model('DailyRecord', dailyRecordSchema);