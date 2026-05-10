'use strict';
const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             isDev ? 1000 : 100,   // relaxed in dev
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs:               15 * 60 * 1000,
  max:                    isDev ? 100 : 10,  // relaxed in dev
  standardHeaders:        true,
  legacyHeaders:          false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
});

const recoverAdminRateLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many attempts. Try again later.',
    });
  },
});

const adminChangePasswordRateLimiter = rateLimit({
  windowMs:        1 * 60 * 1000,  // 1 minute
  max:             3,  // 3 requests per minute
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password change attempts. Try again in 1 minute.',
    });
  },
});

module.exports = { globalLimiter, authLimiter, recoverAdminRateLimiter, adminChangePasswordRateLimiter };