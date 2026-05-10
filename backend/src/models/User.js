'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const normalizePhoneNumber = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '0' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits;
  if (digits.length === 12 && digits.startsWith('92')) return '0' + digits.slice(2);
  if (digits.length === 13 && digits.startsWith('092')) return digits.slice(1);
  if (digits.length === 14 && digits.startsWith('0092')) return '0' + digits.slice(4);
  return digits;
};

const userSchema = new mongoose.Schema({
  name: {
    type:      String,
    required:  [true, 'Name is required'],
    trim:      true,
    maxlength: [80, 'Name too long'],
  },
  email: {
    type:      String,
    required:  [true, 'Email is required'],
    lowercase: true,
    trim:      true,
    match:     [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    // ✅ unique removed here — defined in schema.index() below
  },
  password: {
    type:      String,
    required:  [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select:    false,
  },
  recoveryKeyHash: {
    type:   String,
    select: false,
  },
  phone: {
    type:   String,
    trim:   true,
    select: false,
    comment: 'Plain string phone number set by admin; also used as fallback login credential',
  },
  role: {
    type:    String,
    enum:    ['admin', 'customer'],
    default: 'customer',
  },
  isActive: { type: Boolean, default: true },

  // Brute-force protection fields
  failedLoginAttempts: { type: Number,  default: 0,    select: false },
  lockUntil:           { type: Date,                   select: false },
  isLocked:            { type: Boolean, default: false, select: false },

  passwordChangedAt:   { type: Date,                   select: false },
}, {
  timestamps: true,
  strict:     true,
});

// ─── Hooks ───────────────────────────────────────────────────

userSchema.pre('save', async function (next) {
  if (this.phone) {
    this.phone = normalizePhoneNumber(this.phone);
  }

  if (!this.isModified('password')) return next();
  this.password          = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// ─── Instance Methods ─────────────────────────────────────────

userSchema.methods.comparePassword = async function (plain) {
  // ✅ NEW: Add defensive check for valid bcrypt hash format
  if (!this.password || typeof this.password !== 'string' || !this.password.startsWith('$2')) {
    throw new Error('Invalid password hash in database. User password may not have been properly hashed.');
  }
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.incrementFailedAttempts = async function () {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 5) {
    this.isLocked  = true;
    this.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hour lock
  }
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.resetFailedAttempts = async function () {
  this.failedLoginAttempts = 0;
  this.isLocked            = false;
  this.lockUntil           = undefined;
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.recoveryKeyHash;
  delete obj.phone;
  delete obj.failedLoginAttempts;
  delete obj.lockUntil;
  delete obj.isLocked;
  delete obj.__v;
  return obj;
};

// ─── Indexes ─────────────────────────────────────────────────
// ✅ Only defined here — not duplicated in field definition above
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);