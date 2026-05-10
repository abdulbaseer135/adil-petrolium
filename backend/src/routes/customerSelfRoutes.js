'use strict';
const router = require('express').Router();
const { authenticate, authorize, enforceCustomerOwnership } = require('../middleware/auth');
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const txCtrl   = require('../controllers/transactionController');
const custCtrl = require('../controllers/customerController');
const reportCtrl = require('../controllers/reportController');

router.use(authenticate, authorize('customer'), enforceCustomerOwnership);

router.get('/profile',              custCtrl.getMyProfile);
router.get('/transactions',
	[
		query('page').optional().isInt({ min: 1 }).toInt(),
		query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
	], validate, txCtrl.getMyTransactions);
router.get('/statement/download',
	[ query('date').optional().isISO8601().withMessage('Valid date required') ],
	validate, reportCtrl.exportMyStatement);
router.get('/summary/monthly',
	[ query('year').optional().isInt({ min: 2000 }).toInt(), query('month').optional().isInt({ min: 1, max: 12 }).toInt() ],
	validate, custCtrl.getMySummaryMonthly);
router.get('/summary/yearly',
	[ query('year').optional().isInt({ min: 2000 }).toInt() ],
	validate, custCtrl.getMySummaryYearly);

module.exports = router;