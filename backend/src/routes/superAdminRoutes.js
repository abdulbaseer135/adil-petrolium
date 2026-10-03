'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/superAdminController');
const { authenticate, authorize } = require('../middleware/auth');
const { param, query, body } = require('express-validator');
const validate = require('../middleware/validate');

// Strictly protect all super-admin endpoints
router.use(authenticate, authorize('super_admin'));

// Platform dashboard
router.get('/dashboard', ctrl.getDashboardStats);

// Petrol pumps management
router.get('/petrol-pumps', ctrl.getPetrolPumps);
router.get('/petrol-pumps/:id', [param('id').isMongoId().withMessage('Valid petrol pump ID required')], validate, ctrl.getPetrolPumpDetail);

// Approvals & lifecycle
router.patch('/petrol-pumps/:id/approve', [param('id').isMongoId().withMessage('Valid petrol pump ID required')], validate, ctrl.approvePetrolPump);
router.patch('/petrol-pumps/:id/reject', [param('id').isMongoId().withMessage('Valid petrol pump ID required')], validate, ctrl.rejectPetrolPump);
router.patch('/petrol-pumps/:id/suspend', [param('id').isMongoId().withMessage('Valid petrol pump ID required')], validate, ctrl.suspendPetrolPump);
router.patch('/petrol-pumps/:id/reactivate', [param('id').isMongoId().withMessage('Valid petrol pump ID required')], validate, ctrl.reactivatePetrolPump);

// Platform users
router.get('/admins', ctrl.getAdmins);
router.get('/customers', ctrl.getCustomers);

// Platform audit logs
router.get('/audit-logs', ctrl.getAuditLogs);

module.exports = router;
