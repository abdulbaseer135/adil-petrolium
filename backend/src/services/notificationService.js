'use strict';
const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Notification Service
 * Central place for creating, querying, and managing notifications.
 */

// ─── Create a notification ──────────────────────────────────────
const createNotification = async ({ recipientId, recipientRole, type, title, message, metadata = {} }) => {
  try {
    const notif = await Notification.create({ recipientId, recipientRole, type, title, message, metadata });
    logger.info({ notifId: notif._id, recipientId, type }, 'Notification created');
    return notif;
  } catch (err) {
    logger.error({ err: err.message, recipientId, type }, 'Failed to create notification');
    // Non-blocking — never let notification failures crash the main flow
  }
};

// ─── Notify ALL Super Admins ────────────────────────────────────
const notifySuperAdmins = async ({ type, title, message, metadata = {} }) => {
  try {
    const superAdmins = await User.find({ role: 'super_admin', isActive: true }).select('_id').lean();
    const notifications = superAdmins.map((sa) => ({
      recipientId: sa._id,
      recipientRole: 'super_admin',
      type,
      title,
      message,
      metadata,
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      logger.info({ type, count: notifications.length }, 'Super admin notifications created');
    }
  } catch (err) {
    logger.error({ err: err.message, type }, 'Failed to notify super admins');
  }
};

// ─── Get notifications for a user ───────────────────────────────
const getNotifications = async ({ userId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipientId: userId }),
    Notification.countDocuments({ recipientId: userId, isRead: false }),
  ]);
  return {
    notifications,
    unreadCount,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Get unread count only ──────────────────────────────────────
const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ recipientId: userId, isRead: false });
};

// ─── Mark single notification as read ───────────────────────────
const markAsRead = async (notificationId, userId) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: userId },
    { isRead: true },
    { new: true }
  );
  return notif;
};

// ─── Mark ALL notifications as read ─────────────────────────────
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { isRead: true }
  );
  return result.modifiedCount;
};

// ─── Delete a notification ──────────────────────────────────────
const deleteNotification = async (notificationId, userId) => {
  return Notification.findOneAndDelete({ _id: notificationId, recipientId: userId });
};

// ══════════════════════════════════════════════════════════════════
// FinTech Notification Triggers
// ══════════════════════════════════════════════════════════════════

/**
 * Trigger: New petrol pump registration → Notify Super Admin
 */
const onPumpRegistered = async ({ pumpName, adminName, city }) => {
  await notifySuperAdmins({
    type: 'new_pump_registration',
    title: 'New Pump Registration',
    message: `${adminName} has registered "${pumpName}" (${city || 'N/A'}) and is awaiting your approval.`,
    metadata: { pumpName, adminName, city },
  });
};

/**
 * Trigger: Customer submits link request → Notify Pump Admin(s)
 */
const onCustomerLinkRequest = async ({ petrolPumpId, customerName, pumpName }) => {
  try {
    const admins = await User.find({ role: 'admin', petrolPumpId, isActive: true }).select('_id').lean();
    const notifications = admins.map((admin) => ({
      recipientId: admin._id,
      recipientRole: 'admin',
      type: 'customer_link_request',
      title: 'Customer Connection Request',
      message: `${customerName} has requested to connect to your station "${pumpName}".`,
      metadata: { petrolPumpId: String(petrolPumpId), customerName, pumpName },
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to notify admins on link request');
  }
};

/**
 * Trigger: Admin approves link request → Notify Customer
 */
const onLinkRequestApproved = async ({ customerUserId, pumpName }) => {
  await createNotification({
    recipientId: customerUserId,
    recipientRole: 'customer',
    type: 'link_request_approved',
    title: 'Connection Approved ✅',
    message: `Your connection request to "${pumpName}" has been approved. You can now view your account.`,
    metadata: { pumpName },
  });
};

/**
 * Trigger: Admin rejects link request → Notify Customer
 */
const onLinkRequestRejected = async ({ customerUserId, pumpName, reason }) => {
  await createNotification({
    recipientId: customerUserId,
    recipientRole: 'customer',
    type: 'link_request_rejected',
    title: 'Connection Rejected',
    message: `Your connection request to "${pumpName}" was declined.${reason ? ` Reason: ${reason}` : ''}`,
    metadata: { pumpName, reason },
  });
};

/**
 * Trigger: Admin creates a transaction → Notify Customer
 */
const onLedgerEntry = async ({ customerUserId, pumpName, transactionType, amount, updatedBalance }) => {
  if (!customerUserId) return; // Only notify linked customers

  const typeLabels = {
    fuel_sale: 'Fuel Sale',
    payment: 'Payment Received',
    adjustment: 'Balance Adjustment',
    credit_note: 'Credit Note',
    opening_balance: 'Opening Balance',
  };
  const label = typeLabels[transactionType] || transactionType;
  const formattedAmt = `PKR ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  const formattedBal = `PKR ${Number(updatedBalance || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

  await createNotification({
    recipientId: customerUserId,
    recipientRole: 'customer',
    type: 'ledger_entry',
    title: `${label} — ${formattedAmt}`,
    message: `A ${label.toLowerCase()} of ${formattedAmt} was recorded at "${pumpName}". Updated balance: ${formattedBal}.`,
    metadata: { pumpName, transactionType, amount, updatedBalance },
  });
};

module.exports = {
  createNotification,
  notifySuperAdmins,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  // FinTech triggers
  onPumpRegistered,
  onCustomerLinkRequest,
  onLinkRequestApproved,
  onLinkRequestRejected,
  onLedgerEntry,
};
