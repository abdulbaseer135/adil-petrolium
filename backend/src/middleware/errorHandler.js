'use strict';
const AppError = require('../utils/AppError');
const logger   = require('../utils/logger');
const config   = require('../config');

const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`${field} already exists`, 409);
};

const handleValidationError = (err) => {
  const msgs = Object.values(err.errors).map(e => e.message);
  return new AppError(`Validation error: ${msgs.join(', ')}`, 400);
};

const handleJWTError  = () => new AppError('Invalid token. Please log in again.', 401);
const handleJWTExpiry = () => new AppError('Your session has expired. Please log in again.', 401);

module.exports = (err, req, res, next) => {
  let error = err;

  if (err.name === 'CastError')             error = handleCastError(err);
  if (err.code === 11000)                   error = handleDuplicateKey(err);
  if (err.name === 'ValidationError')       error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError')     error = handleJWTError();
  if (err.name === 'TokenExpiredError')     error = handleJWTExpiry();

  // ✅ NEW: Handle bcrypt password validation errors
  if (err.message && err.message.includes('Invalid password hash in database')) {
    error = new AppError('Database error: User password is corrupted. Please contact support to reset your password.', 500);
  }

  error.statusCode = error.statusCode || 500;

  // Log 5xx errors always; 4xx at warn level
  if (error.statusCode >= 500) {
    logger.error({ err: error, reqId: req.id, url: req.url, method: req.method }, 'Server error');
  } else {
    logger.warn({ statusCode: error.statusCode, message: error.message, reqId: req.id }, 'Client error');
  }

  // Never expose stack traces in production
  const payload = {
    success:    false,
    message:    error.isOperational ? error.message : 'An unexpected error occurred',
    ...(error.errors?.length ? { errors: error.errors } : {}),
    ...(config.env !== 'production' && !error.isOperational ? { stack: err.stack } : {}),
  };

  return res.status(error.statusCode).json(payload);
};