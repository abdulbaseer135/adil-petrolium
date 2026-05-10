'use strict';
const router = require('express').Router();
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const ctrl   = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));
router.get('/',
	[
		query('page').optional().isInt({ min: 1 }).toInt(),
		query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
		query('startDate').optional().isISO8601(),
		query('endDate').optional().isISO8601(),
		query('action').optional().trim().isString(),
		query('actor').optional().trim().isString(),
	],
	validate,
	ctrl.getLogs
);

module.exports = router;