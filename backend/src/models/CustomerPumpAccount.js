'use strict';
const mongoose = require('mongoose');

const customerPumpAccountSchema = new mongoose.Schema({
  petrolPumpId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PetrolPump',
    required: [true, 'Petrol pump reference is required'],
    index: true,
  },
  customerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Maintained for backward compatibility with queries expecting userId
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  customerName: {
    type: String,
    trim: true,
    default: '',
  },
  customerCode: {
    type: String,
    required: [true, 'Customer code is required'],
    uppercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  vehicleInfo: {
    type: String,
    trim: true,
    default: '',
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: [0, 'Credit limit cannot be negative'],
  },
  currentBalance: {
    type: Number,
    default: 0,
    comment: 'Positive = customer owes money. Negative = credit in customer favor.',
  },
  status: {
    type: String,
    enum: ['unclaimed', 'active', 'inactive', 'suspended', 'closed'],
    default: 'active',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    default: '',
  },
  linkedAt: {
    type: Date,
    default: null,
  },
  claimToken: {
    type: String,
    select: false,
  },
  claimTokenExpiresAt: {
    type: Date,
    select: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  strict: true,
});

// Pre-save hook: keep customerUserId and userId synchronized
customerPumpAccountSchema.pre('save', function (next) {
  if (this.customerUserId && !this.userId) {
    this.userId = this.customerUserId;
  } else if (this.userId && !this.customerUserId) {
    this.customerUserId = this.userId;
  }
  if (this.isActive === false && this.status === 'active') {
    this.status = 'inactive';
  } else if (this.isActive === true && this.status === 'inactive') {
    this.status = 'active';
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────
// Tenant-scoped uniqueness: customerCode is unique per petrol pump
customerPumpAccountSchema.index({ petrolPumpId: 1, customerCode: 1 }, { unique: true });

// A user can be linked to a petrol pump at most once (partial index: only when customerUserId is an ObjectId)
customerPumpAccountSchema.index(
  { customerUserId: 1, petrolPumpId: 1 },
  {
    unique: true,
    partialFilterExpression: { customerUserId: { $type: 'objectId' } },
  }
);

customerPumpAccountSchema.index({ petrolPumpId: 1, isActive: 1 });
customerPumpAccountSchema.index({ petrolPumpId: 1, currentBalance: -1 });
customerPumpAccountSchema.index({ phone: 1 });
customerPumpAccountSchema.index({ customerUserId: 1 });
customerPumpAccountSchema.index({ userId: 1 });

const CustomerPumpAccount = mongoose.models.CustomerPumpAccount ||
  mongoose.model('CustomerPumpAccount', customerPumpAccountSchema);

module.exports = CustomerPumpAccount;
