'use strict';

const router = require('express').Router();
const { query, param } = require('express-validator');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/dailyRecordController');
const { authenticate, authorize, requireApprovedAccount, resolveTenant } = require('../middleware/auth');

router.use(authenticate, authorize('admin'), requireApprovedAccount, resolveTenant);

/**
 * GET /daily-records
 * List daily records with pagination
 */
router.get('/', ctrl.listRecords);

/**
 * GET /daily-records/by-date?date=YYYY-MM-DD
 * Get or create a record for the selected date
 */
router.get('/by-date', [ query('date').optional().isISO8601().withMessage('Valid date required') ], validate, ctrl.getOrCreate);

/**
 * GET /daily-records/today
 * Get or create today's record
 */
router.get('/today', ctrl.getToday);

/**
 * POST /daily-records/:id/lock
 * Lock a record
 */
router.post('/:id/lock', [ param('id').isMongoId().withMessage('Invalid record id') ], validate, ctrl.lockRecord);

module.exports = router;