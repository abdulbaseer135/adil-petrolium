'use strict';
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PetrolPump = require('../models/PetrolPump');
const authService = require('../services/authService');
const notificationService = require('../services/notificationService');
const { sendSuccess } = require('../utils/apiResponse');
const config = require('../config');
const logger = require('../utils/logger');
const generateRecoveryKey = require('../utils/generateRecoveryKey');

const isProd = config.env === 'production';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
};

const registerAdmin = async (req, res, next) => {
  try {
    const {
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
    } = req.body;

    const result = await authService.registerAdmin({
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
      ipAddress: req.ip,
      requestId: req.id,
    });

    // Notify all Super Admins about new pump registration
    notificationService.onPumpRegistered({
      pumpName: pumpName,
      adminName: name,
      city: city || '',
    });

    return sendSuccess(
      res,
      { user: result.user, pump: result.pump },
      'Your petrol pump registration has been submitted for approval.',
      201
    );
  } catch (err) {
    next(err);
  }
};

const registerCustomer = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const result = await authService.registerCustomer({
      name,
      email,
      password,
      phone,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    });

    res.cookie('accessToken', result.accessToken, {
      ...COOKIE_OPTS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/',
    });

    const responseData = {
      ...result.user,
      _tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };

    return sendSuccess(res, responseData, 'Customer registration successful', 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    });

    res.cookie('accessToken', result.accessToken, {
      ...COOKIE_OPTS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/',
    });

    const responseData = {
      ...result.user,
      _tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };

    return sendSuccess(res, responseData, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    let rawRefreshToken = req.cookies?.refreshToken;

    if (!rawRefreshToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        rawRefreshToken = authHeader.substring(7);
      }
    }

    if (!rawRefreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    const result = await authService.refreshAccessToken({
      rawRefreshToken,
      ipAddress: req.ip,
      requestId: req.id,
    });

    res.cookie('accessToken', result.accessToken, {
      ...COOKIE_OPTS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/',
    });

    return sendSuccess(res, {
      _tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    }, 'Token refreshed successfully');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout({
      userId: req.user._id,
      rawRefreshToken: req.cookies?.refreshToken,
      requestId: req.id,
    });

    res.clearCookie('accessToken', COOKIE_OPTS);
    res.clearCookie('refreshToken', { ...COOKIE_OPTS, path: '/api/v1/auth/' });

    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    let petrolPump = null;
    if (req.user.role === 'admin') {
      if (req.user.petrolPumpId) {
        petrolPump = await PetrolPump.findById(req.user.petrolPumpId).lean();
      }
      if (!petrolPump) {
        petrolPump = await PetrolPump.findOne({ admins: req.user._id }).lean();
      }
    }

    return sendSuccess(res, {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || '',
      role: req.user.role,
      status: req.user.status || 'active',
      petrolPumpId: petrolPump?._id || req.user.petrolPumpId || null,
      petrolPumpName: petrolPump?.name || null,
      petrolPumpStatus: petrolPump?.status || null,
    });
  } catch (err) {
    next(err);
  }
};

const recoverAdminPassword = async (req, res, next) => {
  try {
    const { email, recoveryKey, newPassword } = req.body;

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      role: 'admin',
      isActive: true,
    }).select('+recoveryKeyHash');

    if (!user || !user.recoveryKeyHash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isRecoveryKeyValid = await bcrypt.compare(recoveryKey.trim(), user.recoveryKeyHash);
    if (!isRecoveryKeyValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const newRecoveryKey = generateRecoveryKey();
    const [newPasswordHash, newRecoveryKeyHash] = await Promise.all([
      bcrypt.hash(newPassword, 12),
      bcrypt.hash(newRecoveryKey, 12),
    ]);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: newPasswordHash,
          recoveryKeyHash: newRecoveryKeyHash,
          passwordChangedAt: new Date(Date.now() - 1000),
        },
      }
    );

    logger.info({ adminId: user._id, event: 'admin_password_recovered' }, 'Admin password recovered');

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. The new recovery key has been issued to the owner via secure channels.',
    });
  } catch (err) {
    next(err);
  }
};

const regenerateRecoveryKey = async (req, res, next) => {
  try {
    const user = req.user;
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const newRecoveryKey = generateRecoveryKey();
    const newRecoveryKeyHash = await bcrypt.hash(newRecoveryKey, 12);

    await User.updateOne(
      { _id: user._id },
      { $set: { recoveryKeyHash: newRecoveryKeyHash } }
    );

    logger.info({ adminId: user._id, event: 'recovery_key_regenerated' }, 'Admin recovery key regenerated');

    await require('../services/auditService').createAuditLog({
      action: 'ADMIN_RECOVERY_KEY_REGENERATED',
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      targetId: user._id,
      targetModel: 'User',
      details: { email: user.email, action: 'recovery_key_regenerated' },
      requestId: req.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Recovery key regenerated. Deliver the new key via a secure channel.',
    });
  } catch (err) {
    next(err);
  }
};

const adminChangePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const user = req.user;

    const userDoc = await User.findById(user._id).select('+password');
    if (!userDoc) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword.trim(), userDoc.password);
    if (!isOldPasswordValid) {
      return res.status(400).json({ success: false, message: 'Old password is incorrect' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: newPasswordHash,
          passwordChangedAt: new Date(Date.now() - 1000),
        },
      }
    );

    logger.info({ userId: user._id, event: 'password_changed' }, 'Password changed');

    await require('../services/auditService').createAuditLog({
      action: 'PASSWORD_CHANGED',
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      targetId: user._id,
      targetModel: 'User',
      details: { email: user.email, action: 'password_change' },
      requestId: req.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

const getSuperAdminSetupStatus = async (req, res, next) => {
  try {
    const data = await authService.getSuperAdminSetupStatus();
    return sendSuccess(res, data, 'Super Admin setup status retrieved');
  } catch (err) {
    next(err);
  }
};

const setupSuperAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const user = await authService.setupSuperAdmin({
      name,
      email,
      password,
      phone,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    });

    return sendSuccess(
      res,
      user,
      'Super Admin account created successfully. Please sign in.',
      201
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerAdmin,
  registerCustomer,
  login,
  refresh,
  logout,
  me,
  recoverAdminPassword,
  regenerateRecoveryKey,
  adminChangePassword,
  getSuperAdminSetupStatus,
  setupSuperAdmin,
};