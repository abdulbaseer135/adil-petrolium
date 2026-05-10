'use strict';
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const User     = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const config   = require('../config');
const AppError = require('../utils/AppError');
const logger   = require('../utils/logger');
const { createAuditLog } = require('./auditService');

// ─── Helpers ─────────────────────────────────────────────────

const signAccessToken = (user) =>
  jwt.sign(
    { userId: user._id.toString(), role: user.role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn, jwtid: crypto.randomUUID() }
  );

const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');

const hashToken = (raw) =>
  crypto.createHash('sha256').update(raw).digest('hex');

// ─── Login ───────────────────────────────────────────────────

const login = async ({ email, password, ipAddress, userAgent, requestId }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  // Find user by email only. The password field can still accept the user's password or their mobile number as a fallback.
  const user = await User.findOne({ email: normalizedEmail })
    .select('+password +phone +isLocked +lockUntil +failedLoginAttempts');

  if (!user) {
    logger.warn({ email: '[REDACTED]', ip: ipAddress }, 'Login failed — invalid credentials');
    throw new AppError('Invalid credentials', 401);
  }

  // Check account lock
  if (user.isLocked && user.lockUntil > Date.now()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new AppError(`Account locked. Try again in ${minutesLeft} minute(s)`, 423);
  }

  const normalizePhone = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 10) return '0' + digits;
    if (digits.length === 11 && digits.startsWith('0')) return digits;
    if (digits.length === 12 && digits.startsWith('92')) return '0' + digits.slice(2);
    if (digits.length === 13 && digits.startsWith('092')) return digits.slice(1);
    if (digits.length === 14 && digits.startsWith('0092')) return '0' + digits.slice(4);
    return digits;
  };

  // Attempt password verification
  let passwordMatch = await user.comparePassword(password);
  
  // Fallback: check if password matches phone number, normalizing common formats.
  let phoneMatch = false;
  if (!passwordMatch && user.phone) {
    const inputPhone = normalizePhone(password.trim());
    const storedPhone = normalizePhone(user.phone);
    phoneMatch = inputPhone !== '' && storedPhone !== '' && inputPhone === storedPhone;
  }

  // If neither password nor phone match, increment failed attempts
  if (!passwordMatch && !phoneMatch) {
    await user.incrementFailedAttempts();
    logger.warn({ userId: user._id, ip: ipAddress }, 'Login failed — invalid credentials');
    throw new AppError('Invalid credentials', 401);
  }

  // Check active status
  if (!user.isActive) {
    throw new AppError('Account has been deactivated. Contact support.', 403);
  }

  // Reset failed attempts on success
  await user.resetFailedAttempts();

  // Generate tokens
  const accessToken      = signAccessToken(user);
  const rawRefreshToken  = generateRefreshToken();
  const hashedToken      = hashToken(rawRefreshToken);

  // Save refresh token to DB
  await RefreshToken.create({
    userId:    user._id,
    tokenHash: hashedToken,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Audit log
  await createAuditLog({
    action:     'USER_LOGIN',
    actor:      user._id,
    actorEmail: user.email,
    actorRole:  user.role,
    details:    { ip: ipAddress },
    requestId,
  });

  logger.info({ userId: user._id, role: user.role, ip: ipAddress }, 'User logged in');

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id:    user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    },
  };
};

// ─── Refresh Access Token ────────────────────────────────────

const refreshAccessToken = async ({ rawRefreshToken, ipAddress, requestId }) => {
  if (!rawRefreshToken) throw new AppError('No refresh token', 401);

  const hashedToken = hashToken(rawRefreshToken);

  const stored = await RefreshToken.findOne({
    tokenHash: hashedToken,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (!stored) throw new AppError('Invalid or expired refresh token', 401);

  const user = await User.findById(stored.userId);
  if (!user || !user.isActive) throw new AppError('User not found or inactive', 401);

  // Rotate — revoke old, issue new
  stored.isRevoked = true;
  await stored.save();

  const newAccessToken     = signAccessToken(user);
  const newRawRefreshToken = generateRefreshToken();
  const newHashedToken     = hashToken(newRawRefreshToken);

  await RefreshToken.create({
    userId:    user._id,
    tokenHash: newHashedToken,
    ipAddress,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  logger.info({ userId: user._id }, 'Token refreshed');

  return { accessToken: newAccessToken, refreshToken: newRawRefreshToken };
};

// ─── Logout ──────────────────────────────────────────────────

const logout = async ({ userId, rawRefreshToken, requestId }) => {
  if (rawRefreshToken) {
    const hashedToken = hashToken(rawRefreshToken);
    await RefreshToken.findOneAndUpdate(
      { tokenHash: hashedToken },
      { isRevoked: true }
    );
  }

  await createAuditLog({
    action:    'USER_LOGOUT',
    actor:     userId,
    actorRole: 'unknown',
    details:   {},
    requestId,
  });

  logger.info({ userId }, 'User logged out');
};

module.exports = { login, refreshAccessToken, logout };