'use strict';
const mongoose = require('mongoose');

/**
 * Notification Model
 * Stores notifications for all user roles (super_admin, admin, customer).
 *
 * Notification Types (by role):
 *
 * Super Admin:
 *  - new_pump_registration: A new petrol pump has registered and awaits approval
 *
 * Petrol Pump Admin:
 *  - customer_link_request: A customer has requested to connect to the pump
 *
 * Customer:
 *  - link_request_approved: Admin approved the customer's connection request
 *  - link_request_rejected: Admin rejected the customer's connection request
 *  - ledger_entry: Admin added a fuel sale, payment, or other transaction to ledger
 */
const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ['super_admin', 'admin', 'customer'],
      required: true,
    },
    type: {
      type: String,
      enum: [
        'new_pump_registration',
        'customer_link_request',
        'link_request_approved',
        'link_request_rejected',
        'ledger_entry',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound index for efficient unread-count queries
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

// TTL: auto-delete notifications older than 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
