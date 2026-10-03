'use strict';
const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authenticate }  = require('../middleware/auth');
const { authLimiter, recoverAdminRateLimiter, adminChangePasswordRateLimiter } = require('../middleware/rateLimiter');
const { validateBody } = require('../middleware/validate');
const { recoverAdminSchema, adminChangePasswordSchema } = require('../validators/authValidator');

// GET /api/v1/auth/super-admin/setup-status
router.get('/super-admin/setup-status', ctrl.getSuperAdminSetupStatus);

// POST /api/v1/auth/super-admin/setup (One-time Super Admin bootstrap)
router.post(
  '/super-admin/setup',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Full name is required (2-80 characters)'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid authorized email is required'),
    body('password').isString().isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters'),
    body('phone').optional().trim(),
  ],
  validate,
  ctrl.setupSuperAdmin
);

// POST /api/v1/auth/register/admin (Petrol pump registration)
router.post(
  '/register/admin',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Admin name is required (2-80 characters)'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isString().isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters'),
    body('phone').optional().trim(),
    body('pumpName').trim().isLength({ min: 2, max: 120 }).withMessage('Petrol pump name is required (2-120 characters)'),
    body('registrationNumber').optional().trim(),
    body('businessEmail').optional().trim().isEmail(),
    body('businessPhone').optional().trim(),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('province').optional().trim(),
  ],
  validate,
  ctrl.registerAdmin
);

// Alias: POST /api/v1/auth/register/petrol-pump
router.post(
  '/register/petrol-pump',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Admin name is required (2-80 characters)'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isString().isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters'),
    body('phone').optional().trim(),
    body('pumpName').trim().isLength({ min: 2, max: 120 }).withMessage('Petrol pump name is required (2-120 characters)'),
    body('registrationNumber').optional().trim(),
    body('businessEmail').optional().trim().isEmail(),
    body('businessPhone').optional().trim(),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('province').optional().trim(),
  ],
  validate,
  ctrl.registerAdmin
);

// POST /api/v1/auth/register/customer (Global customer identity registration)
router.post(
  '/register/customer',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name is required (2-80 characters)'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isString().isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters'),
    body('phone').optional().trim(),
  ],
  validate,
  ctrl.registerCustomer
);

// POST /api/v1/auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email must be a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validate,
  ctrl.login
);

// POST /api/v1/auth/refresh
router.post('/refresh', authLimiter, ctrl.refresh);

// POST /api/v1/auth/admin/recover
router.post(
  '/admin/recover',
  recoverAdminRateLimiter,
  validateBody(recoverAdminSchema),
  ctrl.recoverAdminPassword
);

// POST /api/v1/auth/logout
router.post('/logout', authenticate, ctrl.logout);

// GET /api/v1/auth/me
router.get('/me', authenticate, ctrl.me);

// PUT /api/v1/auth/admin/profile/password
router.put(
  '/admin/profile/password',
  authenticate,
  adminChangePasswordRateLimiter,
  validateBody(adminChangePasswordSchema),
  ctrl.adminChangePassword
);

module.exports = router;