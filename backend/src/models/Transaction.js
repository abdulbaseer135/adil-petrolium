'use strict';
const mongoose = require('mongoose');

const TRANSACTION_TYPES = [
  'fuel_sale',
  'payment',
  'adjustment',
  'credit_note',
  'opening_balance',
];

const FUEL_TYPES = ['pmg', 'hsd', 'nr'];

const transactionSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerProfile',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    comment: 'The User account of the customer (for quick lookup)',
  },
  transactionType: {
    type: String,
    enum: TRANSACTION_TYPES,
    required: true,
  },
  fuelType: {
    type: String,
    enum: FUEL_TYPES,
    required: function requiredFuelType() {
      return this.transactionType === 'fuel_sale';
    },
  },
  fuelQuantity: {
    type: Number,
    min: 0,
    required: function requiredFuelQty() {
      return this.transactionType === 'fuel_sale';
    },
  },
  rate: {
    type: Number,
    min: 0,
    required: function requiredRate() {
      return this.transactionType === 'fuel_sale';
    },
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  paymentReceived: {
    type: Number,
    default: 0,
    min: 0,
  },
  previousBalance: {
    type: Number,
    required: true,
  },
  updatedBalance: {
    type: Number,
    required: true,
  },
  transactionDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  referenceNo: {
    type: String,
    trim: true,
  },
  vehicleNo: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isVoided: {
    type: Boolean,
    default: false,
  },
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  voidedAt: {
    type: Date,
  },
  voidReason: {
    type: String,
  },
}, {
  timestamps: true,
  strict: true,
});

transactionSchema.index({ customerId: 1, transactionDate: -1 });
transactionSchema.index({ customerId: 1, createdAt: -1 });
transactionSchema.index({ customerId: 1, fuelType: 1, transactionDate: -1 });
transactionSchema.index({ transactionDate: -1 });
transactionSchema.index({ isVoided: 1, transactionDate: -1 });
transactionSchema.index({ userId: 1, transactionDate: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);