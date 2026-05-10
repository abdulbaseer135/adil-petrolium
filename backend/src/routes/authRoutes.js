'use strict';
const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authenticate }  = require('../middleware/auth');
const { authLimiter, recoverAdminRateLimiter, adminChangePasswordRateLimiter }   = require('../middleware/rateLimiter');
const { validateBody } = require('../middleware/validate');
const { recoverAdminSchema, adminChangePasswordSchema } = require('../validators/authValidator');

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
      .isString()
      .isLength({ min: 4, max: 128 })
      .withMessage('Password must be between 4 and 128 characters'),
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