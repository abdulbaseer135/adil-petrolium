'use strict';
const router = require('express').Router();

const authRoutes         = require('./authRoutes');
const customerRoutes     = require('./customerRoutes');
const customerSelfRoutes = require('./customerSelfRoutes');
const transactionRoutes  = require('./transactionRoutes');
const dailyRecordRoutes  = require('./dailyRecordRoutes');
const reportRoutes       = require('./reportRoutes');
const auditRoutes        = require('./auditRoutes');
const eventsRoutes       = require('./eventsRoutes');

// CSRF endpoints removed — project no longer uses CSRF tokens

// ─── Public Routes ────────────────────────────────────────────
router.use('/auth', authRoutes);

// ─── Protected Routes ─────────────────────────────────────────
router.use('/customers',     customerRoutes);
router.use('/me',            customerSelfRoutes);
router.use('/transactions',  transactionRoutes);
router.use('/daily-records', dailyRecordRoutes);
router.use('/reports',       reportRoutes);
router.use('/audit-logs',    auditRoutes);
router.use('/events',        eventsRoutes);

module.exports = router;