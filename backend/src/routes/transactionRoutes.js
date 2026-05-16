'use strict';
const router = require('express').Router();
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/transactionController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const txBody = [
  body('customerId').isMongoId().withMessage('Valid customer ID required'),
  body('transactionType')
    .isIn(['fuel_sale','payment','adjustment','credit_note','opening_balance'])
    .withMessage('Invalid transaction type'),
  body('paymentReceived').optional().isFloat({ min: 0 }).withMessage('Must be >= 0'),
  body('fuelQuantity').optional().isFloat({ min: 0 }).withMessage('Must be >= 0'),
  body('rate').optional().isFloat({ min: 0 }).withMessage('Must be >= 0'),
];

router.use(authenticate, authorize('admin'));

router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().custom((val, { req }) => {
      const limit = parseInt(val, 10);
      const maxLimit = req.query.customerId ? 10000 : 100;
      if (Number.isNaN(limit) || limit < 1 || limit > maxLimit) {
        throw new Error(`limit must be between 1 and ${maxLimit}`);
      }
      req.query.limit = limit;
      return true;
    }),
    query('search').optional().trim().isString(),
    query('customerId').optional().isMongoId().withMessage('Invalid customerId'),
    query('startDate').optional().custom((val) => {
      // Accept both date-only (YYYY-MM-DD) and full ISO 8601 formats
      if (!/^\d{4}-\d{2}-\d{2}/.test(val)) {
        throw new Error('Invalid startDate format (use YYYY-MM-DD or ISO 8601)');
      }
      return true;
    }),
    query('endDate').optional().custom((val) => {
      // Accept both date-only (YYYY-MM-DD) and full ISO 8601 formats
      if (!/^\d{4}-\d{2}-\d{2}/.test(val)) {
        throw new Error('Invalid endDate format (use YYYY-MM-DD or ISO 8601)');
      }
      return true;
    }),
    query('sort').optional().custom((val) => {
      // allow comma-separated fields with optional leading '-'
      const allowed = ['transactionDate', 'totalAmount', 'createdAt', 'updatedBalance'];
      const parts = String(val).split(',');
      for (const p of parts) {
        const f = p.trim();
        const name = f.startsWith('-') ? f.slice(1) : f;
        if (!allowed.includes(name)) throw new Error('Invalid sort field');
      }
      return true;
    }),
  ],
  validate,
  ctrl.getTransactions
);
router.post('/', txBody, validate, ctrl.createTransaction);
router.put('/:id/void',
  [param('id').isMongoId(), body('reason').notEmpty().withMessage('Void reason required')],
  validate, ctrl.voidTransaction);

module.exports = router;