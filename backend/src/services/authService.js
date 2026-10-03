'use strict';
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const PetrolPump = require('../models/PetrolPump');
const RefreshToken = require('../models/RefreshToken');
const config = require('../config');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { createAuditLog } = require('./auditService');

// ─── Helpers ─────────────────────────────────────────────────

const signAccessToken = (user) =>
  jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      status: user.status || 'active',
      petrolPumpId: user.petrolPumpId ? user.petrolPumpId.toString() : null,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn, jwtid: crypto.randomUUID() }
  );

const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');

const hashToken = (raw) =>
  crypto.createHash('sha256').update(raw).digest('hex');

// ─── Register Admin (Petrol Pump Registration) ────────────────

const registerAdmin = async ({
  name,
  email,
  password,
  phone,
  pumpName,
  registrationNumber,
  businessEmail,
  businessPhone,
  address,
  city,
  province,
  ipAddress,
  requestId,
}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('Email is already registered', 409);
  }

  const session = await mongoose.startSession();
  try {
    let user;
    let pump;

    await session.withTransaction(async () => {
      [user] = await User.create([{
        name: name.trim(),
        email: normalizedEmail,
        password,
        phone: phone ? phone.trim() : undefined,
        role: 'admin',
        status: 'pending',
        isActive: true,
      }], { session });

      [pump] = await PetrolPump.create([{
        name: (pumpName || `${name}'s Petrol Station`).trim(),
        ownerAdminId: user._id,
        admins: [user._id],
        registrationNumber: registrationNumber ? registrationNumber.trim() : '',
        businessEmail: (businessEmail || normalizedEmail).trim().toLowerCase(),
        businessPhone: (businessPhone || phone || '').trim(),
        address: address ? address.trim() : '',
        city: city ? city.trim() : '',
        province: province ? province.trim() : '',
        status: 'pending',
      }], { session });

      user.petrolPumpId = pump._id;
      await user.save({ session, validateBeforeSave: false });
    });

    await createAuditLog({
      petrolPumpId: pump._id,
      action: 'ADMIN_REGISTERED',
      actor: user._id,
      actorEmail: user.email,
      actorRole: 'admin',
      targetId: pump._id,
      targetModel: 'PetrolPump',
      details: { pumpName: pump.name, city: pump.city, ip: ipAddress },
      requestId,
    });

    logger.info({ adminId: user._id, pumpId: pump._id }, 'New admin & petrol pump registered (pending approval)');

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        petrolPumpId: pump._id,
        petrolPumpName: pump.name,
        petrolPumpStatus: pump.status,
      },
      pump,
    };
  } catch (err) {
    // Fallback if replica sets/transactions are not available in local test environment
    if (String(err.message).toLowerCase().includes('transactions') || String(err.message).toLowerCase().includes('replica set')) {
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        phone: phone ? phone.trim() : undefined,
        role: 'admin',
        status: 'pending',
        isActive: true,
      });

      const pump = await PetrolPump.create({
        name: (pumpName || `${name}'s Petrol Station`).trim(),
        ownerAdminId: user._id,
        admins: [user._id],
        registrationNumber: registrationNumber ? registrationNumber.trim() : '',
        businessEmail: (businessEmail || normalizedEmail).trim().toLowerCase(),
        businessPhone: (businessPhone || phone || '').trim(),
        address: address ? address.trim() : '',
        city: city ? city.trim() : '',
        province: province ? province.trim() : '',
        status: 'pending',
      });

      user.petrolPumpId = pump._id;
      await user.save({ validateBeforeSave: false });

      await createAuditLog({
        petrolPumpId: pump._id,
        action: 'ADMIN_REGISTERED',
        actor: user._id,
        actorEmail: user.email,
        actorRole: 'admin',
        targetId: pump._id,
        targetModel: 'PetrolPump',
        details: { pumpName: pump.name, city: pump.city, ip: ipAddress },
        requestId,
      });

      return {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          petrolPumpId: pump._id,
          petrolPumpName: pump.name,
          petrolPumpStatus: pump.status,
        },
        pump,
      };
    }
    throw err;
  } finally {
    session.endSession();
  }
};

// ─── Register Customer ────────────────────────────────────────

const registerCustomer = async ({ name, email, password, phone, ipAddress, userAgent, requestId }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('Email is already registered', 409);
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    phone: phone ? phone.trim() : '',
    role: 'customer',
    status: 'active',
    isActive: true,
  });

  const accessToken = signAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const hashedToken = hashToken(rawRefreshToken);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashedToken,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await createAuditLog({
    action: 'CUSTOMER_REGISTERED',
    actor: user._id,
    actorEmail: user.email,
    actorRole: 'customer',
    targetId: user._id,
    targetModel: 'User',
    details: { ip: ipAddress },
    requestId,
  });

  logger.info({ userId: user._id }, 'New customer identity registered');

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
  };
};

// ─── Login ───────────────────────────────────────────────────

const login = async ({ email, password, ipAddress, userAgent, requestId }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

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

  // Strictly verify password using bcrypt
  const passwordMatch = await user.comparePassword(password);
  if (!passwordMatch) {
    await user.incrementFailedAttempts();
    logger.warn({ userId: user._id, ip: ipAddress }, 'Login failed — invalid credentials');
    throw new AppError('Invalid credentials', 401);
  }

  // Check active status, pending approval, and suspension
  if (!user.isActive) {
    throw new AppError('Account has been deactivated. Contact support.', 403);
  }
  if (user.status === 'suspended') {
    throw new AppError('Account has been suspended. Contact support.', 403);
  }

  if (user.role === 'admin') {
    if (user.status === 'pending') {
      const err = new AppError('Your petrol pump registration is pending approval by the Super Admin.', 403);
      err.code = 'ACCOUNT_PENDING';
      throw err;
    }
    if (user.status === 'rejected') {
      const err = new AppError('Your petrol pump registration was rejected.', 403);
      err.code = 'ACCOUNT_REJECTED';
      throw err;
    }
  }

  // Reset failed attempts on success
  await user.resetFailedAttempts();

  // If user is an admin, fetch petrol pump details
  let petrolPump = null;
  if (user.role === 'admin') {
    if (user.petrolPumpId) {
      petrolPump = await PetrolPump.findById(user.petrolPumpId);
    }
    if (!petrolPump) {
      petrolPump = await PetrolPump.findOne({ admins: user._id });
      if (petrolPump && !user.petrolPumpId) {
        user.petrolPumpId = petrolPump._id;
        await user.save({ validateBeforeSave: false });
      }
    }
    if (petrolPump) {
      if (petrolPump.status === 'pending') {
        const err = new AppError('Your petrol pump registration is pending approval by the Super Admin.', 403);
        err.code = 'ACCOUNT_PENDING';
        throw err;
      }
      if (petrolPump.status === 'rejected') {
        const err = new AppError(`Your petrol pump registration was rejected: ${petrolPump.rejectionReason || 'Contact support'}`, 403);
        err.code = 'ACCOUNT_REJECTED';
        throw err;
      }
      if (petrolPump.status === 'suspended') {
        const err = new AppError(`Your petrol pump has been suspended: ${petrolPump.suspensionReason || 'Contact support'}`, 403);
        err.code = 'ACCOUNT_SUSPENDED';
        throw err;
      }
    }
  }

  // Generate tokens
  const accessToken = signAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const hashedToken = hashToken(rawRefreshToken);

  // Save refresh token to DB
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashedToken,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Audit log
  await createAuditLog({
    petrolPumpId: petrolPump?._id || user.petrolPumpId || null,
    action: user.role === 'super_admin' ? 'SUPER_ADMIN_LOGIN' : 'USER_LOGIN',
    actor: user._id,
    actorEmail: user.email,
    actorRole: user.role,
    details: { ip: ipAddress, status: user.status },
    requestId,
  });

  logger.info({ userId: user._id, role: user.role, ip: ipAddress }, 'User logged in');

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status || 'active',
      petrolPumpId: petrolPump?._id || user.petrolPumpId || null,
      petrolPumpName: petrolPump?.name || null,
      petrolPumpStatus: petrolPump?.status || null,
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
  if (user.status === 'suspended') throw new AppError('Account has been suspended', 403);

  // Rotate — revoke old, issue new
  stored.isRevoked = true;
  await stored.save();

  const newAccessToken = signAccessToken(user);
  const newRawRefreshToken = generateRefreshToken();
  const newHashedToken = hashToken(newRawRefreshToken);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: newHashedToken,
    ipAddress,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  logger.info({ userId: user._id }, 'Token refreshed');

  return { accessToken: newAccessToken, refreshToken: newRawRefreshToken };
};

// ─── Logout ──────────────────────────────────────────────────

const logout = async ({ userId, userRole, rawRefreshToken, requestId }) => {
  if (rawRefreshToken) {
    const hashedToken = hashToken(rawRefreshToken);
    await RefreshToken.findOneAndUpdate(
      { tokenHash: hashedToken },
      { isRevoked: true }
    );
  }

  await createAuditLog({
    action: userRole === 'super_admin' ? 'SUPER_ADMIN_LOGOUT' : 'USER_LOGOUT',
    actor: userId,
    actorRole: userRole || 'unknown',
    details: {},
    requestId,
  });

  logger.info({ userId }, 'User logged out');
};

// ─── Super Admin One-Time Setup ──────────────────────────────

const getSuperAdminSetupStatus = async () => {
  const superAdminExists = await User.exists({ role: 'super_admin' });
  return { setupRequired: !superAdminExists };
};

const setupSuperAdmin = async ({ name, email, password, phone, ipAddress, userAgent, requestId }) => {
  const configuredEmail = config.superAdminEmail;
  if (!configuredEmail) {
    throw new AppError('Super Admin initialization is not configured on the server', 500);
  }

  const normalizedInputEmail = String(email || '').trim().toLowerCase();
  if (normalizedInputEmail !== configuredEmail) {
    await createAuditLog({
      action: 'SUPER_ADMIN_SETUP_REJECTED',
      actorRole: 'anonymous',
      details: { reason: 'Unauthorized email attempt' },
      ipAddress,
      userAgent,
      requestId,
    });
    throw new AppError('This account is not authorized for Super Admin setup.', 403);
  }

  const superAdminExists = await User.exists({ role: 'super_admin' });
  if (superAdminExists) {
    throw new AppError('Super Admin setup is not available.', 403);
  }

  try {
    const user = await User.create({
      name: (name || 'Super Admin').trim(),
      email: normalizedInputEmail,
      password,
      phone: phone ? phone.trim() : undefined,
      role: 'super_admin',
      status: 'approved',
      isActive: true,
    });

    await createAuditLog({
      action: 'SUPER_ADMIN_CREATED',
      actor: user._id,
      actorEmail: user.email,
      actorRole: 'super_admin',
      targetId: user._id,
      targetModel: 'User',
      targetType: 'User',
      details: { setupMethod: 'one_time_setup' },
      ipAddress,
      userAgent,
      requestId,
    });

    logger.info({ userId: user._id, email: user.email }, 'Super Admin created via one-time setup');

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('Super Admin setup is not available.', 403);
    }
    throw err;
  }
};

module.exports = {
  login,
  registerAdmin,
  registerCustomer,
  refreshAccessToken,
  logout,
  getSuperAdminSetupStatus,
  setupSuperAdmin,
};