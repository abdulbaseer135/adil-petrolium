'use strict';

/**
 * Login validation schema comments and helpers.
 * 
 * The actual validation is applied in authRoutes.js using express-validator.
 * This file documents the expected request structure for the login endpoint.
 * 
 * POST /api/v1/auth/login
 * 
 * Request body:
 * - email: Valid email address (required)
 * - password: String 4-128 chars (accepts both password and phone number as fallback)
 * 
 * Response on success (200):
 * - accessToken, refreshToken (httpOnly secure cookie)
 * - user object with id, name, email, role
 * 
 * Response on failure (401):
 * - Generic message: "Invalid credentials"
 * - Never reveals whether email, password, or phone was the failing factor
 * 
 * Rate limiting:
 * - Max 5 failed login attempts per IP per 15 minutes (authLimiter middleware)
 * - Account locks for 30 minutes after 5 failed attempts
 */

module.exports = {};
