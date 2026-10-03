'use strict';
const mongoose = require('mongoose');

/**
 * CustomerLinkRequest Model
 * 
 * Represents a customer's request to connect their online user identity
 * with a petrol pump customer business/financial account.
 * 
 * Request Types:
 * - existing_account: Customer already deals with the pump and provides their customer code
 * - new_relationship: Customer requests a brand new account relationship at this pump
 * 
 * Statuses:
 * - pending: Awaiting station admin review
 * - approved: Station admin approved; account is linked or created
 * - rejected: Station admin rejected with optional reason
 * - cancelled: Customer cancelled the pending request
 */
const customerLinkRequestSchema = new mongoose.Schema({
  customerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer user reference is required'],
    index: true,
  },
  petrolPumpId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PetrolPump',
    required: [true, 'Petrol pump reference is required'],
    index: true,
  },
  customerPumpAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerPumpAccount',
    default: null,
  },
  requestType: {
    type: String,
    enum: ['existing_account', 'new_relationship'],
    default: 'existing_account',
    required: true,
  },
  requestedCustomerCode: {
    type: String,
    uppercase: true,
    trim: true,
    default: '',
  },
  requestedPhone: {
    type: String,
    trim: true,
    default: '',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true,
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: '',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  strict: true,
});

// ─── Indexes ──────────────────────────────────────────────────
// Prevent duplicate active pending requests from same user for same pump
customerLinkRequestSchema.index(
  { customerUserId: 1, petrolPumpId: 1, status: 1 }
);

// Optimize admin queries for pending requests
customerLinkRequestSchema.index({ petrolPumpId: 1, status: 1, createdAt: -1 });

// Optimize lookup by customerPumpAccountId
customerLinkRequestSchema.index({ customerPumpAccountId: 1, status: 1 });

const CustomerLinkRequest = mongoose.models.CustomerLinkRequest ||
  mongoose.model('CustomerLinkRequest', customerLinkRequestSchema);

module.exports = CustomerLinkRequest;
