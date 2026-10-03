'use strict';
const notificationService = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * Notification Controller
 * Handles GET (list + unread count), PATCH (mark-read), and DELETE for all roles.
 */

// GET /api/v1/notifications?page=1&limit=20
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await notificationService.getNotifications({
      userId: req.user._id,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    return sendSuccess(res, result, 'Notifications retrieved');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    return sendSuccess(res, { unreadCount: count }, 'Unread count retrieved');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const notif = await notificationService.markAsRead(req.params.id, req.user._id);
    if (!notif) return sendError(res, 'Notification not found', 404);
    return sendSuccess(res, notif, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    const count = await notificationService.markAllAsRead(req.user._id);
    return sendSuccess(res, { markedCount: count }, `${count} notifications marked as read`);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/notifications/:id
const deleteNotification = async (req, res, next) => {
  try {
    const notif = await notificationService.deleteNotification(req.params.id, req.user._id);
    if (!notif) return sendError(res, 'Notification not found', 404);
    return sendSuccess(res, null, 'Notification deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification };
