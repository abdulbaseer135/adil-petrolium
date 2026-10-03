'use strict';
const router = require('express').Router();

const authRoutes               = require('./authRoutes');
const superAdminRoutes         = require('./superAdminRoutes');
const petrolPumpRoutes         = require('./petrolPumpRoutes');
const adminCustomerLinkRoutes  = require('./adminCustomerLinkRoutes');
const customerRoutes           = require('./customerRoutes');
const customerPumpRoutes       = require('./customerPumpRoutes');
const customerSelfRoutes       = require('./customerSelfRoutes');
const transactionRoutes        = require('./transactionRoutes');
const dailyRecordRoutes        = require('./dailyRecordRoutes');
const reportRoutes             = require('./reportRoutes');
const auditRoutes              = require('./auditRoutes');
const eventsRoutes             = require('./eventsRoutes');
const notificationRoutes       = require('./notificationRoutes');

// ─── Public & Auth Routes ──────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/petrol-pumps', petrolPumpRoutes);

// ─── Super Admin Routes ────────────────────────────────────────
router.use('/super-admin', superAdminRoutes);

// ─── Admin & Tenant Routes ─────────────────────────────────────
router.use('/admin/customer-links', adminCustomerLinkRoutes);
router.use('/customers',     customerRoutes);
router.use('/transactions',  transactionRoutes);
router.use('/daily-records', dailyRecordRoutes);
router.use('/reports',       reportRoutes);
router.use('/audit-logs',    auditRoutes);
router.use('/events',        eventsRoutes);
router.use('/notifications', notificationRoutes);

// ─── Customer Multi-Pump Portal Routes ─────────────────────────
router.use('/customer/pumps', customerPumpRoutes);
router.use('/customer/pump-links', customerPumpRoutes);
router.use('/customer/pump-accounts', customerPumpRoutes);
router.use('/me',            customerSelfRoutes);

module.exports = router;