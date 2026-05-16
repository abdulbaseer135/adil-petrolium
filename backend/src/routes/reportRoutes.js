'use strict';
const router = require('express').Router();
const { query } = require('express-validator');
const ctrl = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate, authorize('admin'));

// ── JSON report (new) ──────────────────────────────────────────────────────
router.get('/monthly',
  [query('year').isInt({ min: 2000 }), query('month').isInt({ min: 1, max: 12 })],
  validate, ctrl.getMonthlyReport);

// ── Excel exports (unchanged) ──────────────────────────────────────────────
router.get('/export/daily',
  [query('date').isISO8601().withMessage('Valid date required (YYYY-MM-DD)'), query('customerId').optional().isMongoId().withMessage('Invalid customerId')],
  validate, ctrl.exportDaily);

router.get('/export/monthly',
  [query('year').isInt({ min: 2000 }), query('month').isInt({ min: 1, max: 12 }), query('customerId').optional().isMongoId().withMessage('Invalid customerId')],
  validate, ctrl.exportMonthly);

router.get('/export/yearly',
  [query('year').isInt({ min: 2000 }), query('customerId').optional().isMongoId().withMessage('Invalid customerId')],
  validate, ctrl.exportYearly);

router.get('/export/admin-statement-excel',
  [query('customerId').isMongoId().withMessage('Customer ID required'), query('startDate').optional().isISO8601().withMessage('Valid start date required'), query('endDate').optional().isISO8601().withMessage('Valid end date required')],
  validate, ctrl.exportAdminStatementExcel);

module.exports = router;