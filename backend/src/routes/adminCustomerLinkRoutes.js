'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/customerLinkController');
const { authenticate, authorize, resolveTenant } = require('../middleware/auth');
const { param, body } = require('express-validator');
const validate = require('../middleware/validate');

// Strictly protect all admin customer-link routes with authentication, role check, and tenant scoping
router.use(authenticate, authorize('admin'), resolveTenant);

// GET /api/v1/admin/customer-links?status=pending
router.get('/', ctrl.getAdminLinkRequests);

// PATCH /api/v1/admin/customer-links/:id/approve
router.patch(
  '/:id/approve',
  [
    param('id').isMongoId().withMessage('Valid request ID is required'),
    body('customerCode').optional().trim().notEmpty().withMessage('Customer code cannot be empty if specified'),
    body('creditLimit').optional().isNumeric().withMessage('Credit limit must be a number'),
    body('openingBalance').optional().isNumeric().withMessage('Opening balance must be a number'),
  ],
  validate,
  ctrl.approveLinkRequest
);

// PATCH /api/v1/admin/customer-links/:id/reject
router.patch(
  '/:id/reject',
  [
    param('id').isMongoId().withMessage('Valid request ID is required'),
    body('rejectionReason').optional().trim(),
  ],
  validate,
  ctrl.rejectLinkRequest
);

module.exports = router;
