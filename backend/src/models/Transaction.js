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
  petrolPumpId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PetrolPump',
    required: [true, 'Petrol pump is required'],
    index: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerPumpAccount',
    required: [true, 'Customer account is required'],
    index: true,
  },
  customerAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerPumpAccount',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
    comment: 'The global User account of the customer if linked (for quick lookup)',
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

transactionSchema.pre('validate', async function () {
  if (!this.petrolPumpId && this.customerId) {
    const CustomerPumpAccount = require('./CustomerPumpAccount');
    const cust = await CustomerPumpAccount.findById(this.customerId);
    if (cust && cust.petrolPumpId) {
      this.petrolPumpId = cust.petrolPumpId;
    }
  }
});

transactionSchema.pre('save', function (next) {
  if (this.customerId && !this.customerAccountId) {
    this.customerAccountId = this.customerId;
  } else if (this.customerAccountId && !this.customerId) {
    this.customerId = this.customerAccountId;
  }
  next();
});

// Multi-tenant indexes
transactionSchema.index({ petrolPumpId: 1, transactionDate: -1 });
transactionSchema.index({ petrolPumpId: 1, customerId: 1, transactionDate: -1 });
transactionSchema.index({ petrolPumpId: 1, isVoided: 1, transactionDate: -1 });
transactionSchema.index({ customerId: 1, transactionDate: -1 });
transactionSchema.index({ customerId: 1, createdAt: -1 });
transactionSchema.index({ customerId: 1, fuelType: 1, transactionDate: -1 });
transactionSchema.index({ transactionDate: -1 });
transactionSchema.index({ isVoided: 1, transactionDate: -1 });
transactionSchema.index({ userId: 1, transactionDate: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);