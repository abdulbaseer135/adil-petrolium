'use strict';
const mongoose = require('mongoose');

const customerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: true,
  },
  customerCode: {
    type: String, required: true, uppercase: true, trim: true,
  },
  phone:       { type: String, trim: true },
  address:     { type: String, trim: true },
  vehicleInfo: { type: String, trim: true },
  creditLimit: { type: Number, default: 0 },
  currentBalance: {
    type: Number, default: 0,
    comment: 'Positive = customer owes money. Negative = credit in customer favor.',
  },
  isActive:   { type: Boolean, default: true },
  notes:      { type: String  },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true, strict: true,
});

customerProfileSchema.index({ userId:       1 }, { unique: true });
customerProfileSchema.index({ customerCode: 1 }, { unique: true });
customerProfileSchema.index({ isActive:     1 });
customerProfileSchema.index({ currentBalance: -1 });

module.exports = mongoose.model('CustomerProfile', customerProfileSchema);