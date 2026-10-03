'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/customerPumpController');
const linkCtrl = require('../controllers/customerLinkController');
const { authenticate, authorize } = require('../middleware/auth');
const { param, query, body } = require('express-validator');
const validate = require('../middleware/validate');

// Public or customer-authenticated route to view available pumps
router.get('/available', authenticate, ctrl.getAvailablePumps);

// All customer routes below require customer role
router.use(authenticate, authorize('customer'));

// List all petrol pump accounts linked to this customer
router.get('/', ctrl.getMyPumpAccounts);
router.get('/my-accounts', ctrl.getMyPumpAccounts);

// Submit a connection request to a petrol pump (existing account or new relationship)
router.post(
  '/link-request',
  [
    body('petrolPumpId').isMongoId().withMessage('Valid petrolPumpId is required'),
    body('requestType').optional().isIn(['existing_account', 'new_relationship']),
    body('customerCode').optional().trim(),
    body('phone').optional().trim(),
    body('notes').optional().trim(),
  ],
  validate,
  linkCtrl.submitLinkRequest
);

// Alias: POST /link also routes to link-request workflow
router.post(
  '/link',
  [
    body('petrolPumpId').isMongoId().withMessage('Valid petrolPumpId is required'),
    body('customerCode').optional().trim(),
    body('phone').optional().trim(),
  ],
  validate,
  linkCtrl.submitLinkRequest
);

// Get all connection requests made by this customer
router.get('/link-requests', linkCtrl.getMyLinkRequests);

// Cancel a pending connection request
router.patch(
  '/link-requests/:id/cancel',
  [param('id').isMongoId().withMessage('Valid request ID is required')],
  validate,
  linkCtrl.cancelLinkRequest
);

// Detail / dashboard of a specific pump account
router.get(
  '/:pumpAccountId',
  [param('pumpAccountId').isMongoId().withMessage('Valid pumpAccountId required')],
  validate,
  ctrl.getPumpAccountDetail
);

router.get(
  '/:pumpAccountId/dashboard',
  [param('pumpAccountId').isMongoId().withMessage('Valid pumpAccountId required')],
  validate,
  ctrl.getPumpAccountDetail
);

// Transactions for a specific pump account
router.get(
  '/:pumpAccountId/transactions',
  [param('pumpAccountId').isMongoId().withMessage('Valid pumpAccountId required')],
  validate,
  ctrl.getPumpAccountTransactions
);

// Monthly summary for a specific pump account
router.get(
  '/:pumpAccountId/summary/monthly',
  [
    param('pumpAccountId').isMongoId().withMessage('Valid pumpAccountId required'),
    query('year').optional().isInt({ min: 2000, max: 2100 }).toInt(),
  ],
  validate,
  ctrl.getPumpAccountMonthly
);

// Yearly summary for a specific pump account
router.get(
  '/:pumpAccountId/summary/yearly',
  [
    param('pumpAccountId').isMongoId().withMessage('Valid pumpAccountId required'),
    query('year').optional().isInt({ min: 2000, max: 2100 }).toInt(),
  ],
  validate,
  ctrl.getPumpAccountYearly
);

// Download Excel statement for a specific pump account
router.get(
  '/:pumpAccountId/statement/download',
  [param('pumpAccountId').isMongoId().withMessage('Valid pumpAccountId required')],
  validate,
  ctrl.downloadPumpStatement
);

module.exports = router;
