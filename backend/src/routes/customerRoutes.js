'use strict';
const router = require('express').Router();
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/customerController');
const { authenticate, authorize, requireApprovedAccount, resolveTenant } = require('../middleware/auth');
const validate = require('../middleware/validate');

const customerBody = [
  body('name').trim().notEmpty().withMessage('Customer name required'),
  body('customerCode').trim().notEmpty().withMessage('Customer code required'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().normalizeEmail().withMessage('Valid email required if provided'),
  body('phone').optional().trim(),
  body('creditLimit').optional().isNumeric().withMessage('Credit limit must be a number'),
  body('openingBalance').optional().isNumeric().withMessage('Opening balance must be a number'),
];

router.use(authenticate, authorize('admin'), requireApprovedAccount, resolveTenant);

router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim().isString(),
    query('isActive').optional().isBoolean().toBoolean(),
  ],
  validate,
  ctrl.getCustomers
);

router.post('/', customerBody, validate, ctrl.createCustomer);

router.get('/:id', [param('id').isMongoId().withMessage('Invalid customer ID')], validate, ctrl.getCustomer);
router.put('/:id', [param('id').isMongoId().withMessage('Invalid customer ID')], validate, ctrl.updateCustomer);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid customer ID')], validate, ctrl.deleteCustomer);

module.exports = router;