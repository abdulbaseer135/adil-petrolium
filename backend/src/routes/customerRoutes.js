'use strict';
const router = require('express').Router();
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/customerController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const customerBody = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  // Password is optional — if not provided, phone will be used as default
  body('password').optional({ checkFalsy: true }).isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('customerCode').trim().notEmpty().withMessage('Customer code required'),
  // At least one of password or phone is required
  body().custom((value, { req }) => {
    if (!req.body.password && !req.body.phone) {
      throw new Error('Either password or phone is required');
    }
    return true;
  }),
];

router.use(authenticate, authorize('admin'));

router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim().isString(),
    query('isActive').optional().isBoolean().toBoolean(),
    query('sort').optional().custom((val) => {
      const allowed = ['createdAt', 'customerCode', 'customerName'];
      const parts = String(val).split(',');
      for (const p of parts) {
        const f = p.trim();
        const name = f.startsWith('-') ? f.slice(1) : f;
        if (!allowed.includes(name)) throw new Error('Invalid sort field');
      }
      return true;
    }),
  ], validate, ctrl.getCustomers);

router.post('/', customerBody, validate, ctrl.createCustomer);

router.get('/:id', [param('id').isMongoId().withMessage('Invalid customer ID')], validate, ctrl.getCustomer);
router.put('/:id', [param('id').isMongoId().withMessage('Invalid customer ID')], validate, ctrl.updateCustomer);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid customer ID')], validate, ctrl.deleteCustomer);

module.exports = router;