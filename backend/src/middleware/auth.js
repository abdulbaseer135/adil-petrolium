'use strict';
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PetrolPump = require('../models/PetrolPump');
const CustomerPumpAccount = require('../models/CustomerPumpAccount');
const config = require('../config');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) throw new AppError('Authentication required', 401);

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret);
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }

    const user = await User.findById(decoded.userId).select('+isLocked +lockUntil');
    if (!user) throw new AppError('User no longer exists', 401);
    if (!user.isActive) throw new AppError('Account has been deactivated', 401);
    if (user.status === 'suspended') {
      throw new AppError('Account has been suspended. Please contact support.', 403);
    }
    if (user.isLocked && user.lockUntil > Date.now()) {
      throw new AppError('Account temporarily locked due to failed login attempts', 423);
    }

    req.user = user;
    req.id = req.headers['x-request-id'] || decoded.jti;
    next();
  } catch (err) {
    next(err);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    logger.warn({
      userId: req.user._id,
      role: req.user.role,
      required: roles,
      url: req.url,
    }, 'Authorization denied');
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};

const requireApprovedAccount = async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin') return next();

    if (req.user.role === 'admin') {
      if (req.user.status === 'pending') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_PENDING',
          message: 'Your petrol pump registration is pending approval by the Super Admin.',
        });
      }
      if (req.user.status === 'rejected') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_REJECTED',
          message: 'Your petrol pump registration was rejected.',
        });
      }
      if (req.user.status === 'suspended') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your admin account has been suspended.',
        });
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

const resolveTenant = async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin') {
      // Super admin can specify petrolPumpId in query/body/param or header
      const requestedPumpId = req.query.petrolPumpId || req.body?.petrolPumpId || req.params.pumpId || req.headers['x-petrol-pump-id'];
      if (requestedPumpId) {
        req.petrolPumpId = requestedPumpId.toString();
      }
      return next();
    }

    if (req.user.role !== 'admin') {
      return next(new AppError('Tenant resolution only applies to administrators', 403));
    }

    let pump = null;
    if (req.user.petrolPumpId) {
      pump = await PetrolPump.findById(req.user.petrolPumpId);
    }

    if (!pump) {
      pump = await PetrolPump.findOne({ admins: req.user._id });
      if (pump) {
        req.user.petrolPumpId = pump._id;
        await req.user.save({ validateBeforeSave: false });
      }
    }

    if (!pump) {
      return res.status(403).json({
        success: false,
        code: 'NO_PUMP_ASSOCIATED',
        message: 'No petrol pump is associated with this administrator account.',
      });
    }

    if (pump.status === 'pending') {
      return res.status(403).json({
        success: false,
        code: 'PUMP_PENDING',
        message: 'Your petrol pump registration is pending approval.',
      });
    }

    if (pump.status === 'rejected') {
      return res.status(403).json({
        success: false,
        code: 'PUMP_REJECTED',
        message: `Your petrol pump registration was rejected: ${pump.rejectionReason || 'Contact support'}`,
      });
    }

    if (pump.status === 'suspended') {
      return res.status(403).json({
        success: false,
        code: 'PUMP_SUSPENDED',
        message: `Your petrol pump has been suspended: ${pump.suspensionReason || 'Contact support'}`,
      });
    }

    req.petrolPumpId = pump._id.toString();
    req.petrolPump = pump;
    next();
  } catch (err) {
    next(err);
  }
};

const enforceCustomerOwnership = async (req, res, next) => {
  try {
    if (req.user.role === 'admin' || req.user.role === 'super_admin') return next();

    // Look for requested pumpAccountId or fall back to any active linked account for this customer
    const requestedId = req.query.pumpAccountId || req.headers['x-pump-account-id'];
    const query = {
      $or: [
        { customerUserId: req.user._id },
        { userId: req.user._id },
      ],
      isActive: true,
    };

    if (requestedId) {
      query._id = requestedId;
    }

    const account = await CustomerPumpAccount.findOne(query).populate('petrolPumpId', 'name city address status');
    if (!account) {
      return res.status(404).json({
        success: false,
        code: 'NO_LINKED_ACCOUNT',
        message: 'No linked petrol pump account found. Please link an account to view your balance and statements.',
      });
    }

    req.customerId = account._id.toString();
    req.customerAccountId = account._id.toString();
    req.petrolPumpId = (account.petrolPumpId?._id || account.petrolPumpId).toString();
    req.customerAccount = account;
    next();
  } catch (err) {
    next(err);
  }
};

const requireSuperAdmin = authorize('super_admin');
const requireAdmin = authorize('admin');
const requireCustomer = authorize('customer');

module.exports = {
  authenticate,
  authorize,
  requireSuperAdmin,
  requireAdmin,
  requireCustomer,
  requireApprovedAccount,
  resolveTenant,
  enforceCustomerOwnership,
};