'use strict';
const router = require('express').Router();
const { param, query } = require('express-validator');
const ctrl = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All notification endpoints require authentication (any role)
router.use(authenticate);

// GET /api/v1/notifications — list notifications with pagination
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  validate,
  ctrl.getNotifications
);

// GET /api/v1/notifications/unread-count — lightweight unread badge count
router.get('/unread-count', ctrl.getUnreadCount);

// PATCH /api/v1/notifications/read-all — mark all as read
router.patch('/read-all', ctrl.markAllAsRead);

// PATCH /api/v1/notifications/:id/read — mark single as read
router.patch(
  '/:id/read',
  [param('id').isMongoId().withMessage('Valid notification ID required')],
  validate,
  ctrl.markAsRead
);

// DELETE /api/v1/notifications/:id — delete a notification
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Valid notification ID required')],
  validate,
  ctrl.deleteNotification
);

module.exports = router;
