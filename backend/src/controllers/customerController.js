'use strict';
const customerService = require('../services/customerService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const createCustomer = async (req, res, next) => {
  try {
    const result = await customerService.createCustomer({
      ...req.body, createdBy: req.user._id, requestId: req.id,
    });
    // Return the created profile (consistent with other customer endpoints)
    return sendSuccess(res, result.profile, 'Customer created successfully', 201);
  } catch (err) { next(err); }
};

const getCustomers = async (req, res, next) => {
  try {
    const { page, limit, search, isActive, sort } = req.query;
    const result = await customerService.getCustomers({ page, limit, search, isActive, sort, requestingUser: req.user });
    return sendSuccess(res, result.customers, 'Customers retrieved', 200, result.meta);
  } catch (err) { next(err); }
};

const getCustomer = async (req, res, next) => {
  try {
    const profile = await require('../models/CustomerProfile')
      .findById(req.params.id)
      .populate('userId', 'name email')
      .lean();
    if (!profile) return sendError(res, 'Customer not found', 404);

    // Enforce ownership for admin users
    if (req.user && req.user.role === 'admin') {
      if (!profile.createdBy) return sendError(res, 'You do not have permission to perform this action', 403);
      if (String(profile.createdBy) !== String(req.user._id)) {
        return sendError(res, 'You do not have permission to perform this action', 403);
      }
    }

    return sendSuccess(res, profile);
  } catch (err) { next(err); }
};

const updateCustomer = async (req, res, next) => {
  try {
    // Ownership check before updating
    const existing = await require('../models/CustomerProfile').findById(req.params.id).lean();
    if (!existing) return sendError(res, 'Customer not found', 404);
    if (req.user && req.user.role === 'admin') {
      if (!existing.createdBy) return sendError(res, 'You do not have permission to perform this action', 403);
      if (String(existing.createdBy) !== String(req.user._id)) {
        return sendError(res, 'You do not have permission to perform this action', 403);
      }
    }

    const profile = await customerService.updateCustomer({
      profileId: req.params.id, updates: req.body,
      updatedBy: req.user._id, requestId: req.id,
    });
    return sendSuccess(res, profile, 'Customer updated');
  } catch (err) { next(err); }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const CustomerProfile = require('../models/CustomerProfile');
    const User = require('../models/User');

    const existing = await CustomerProfile.findById(req.params.id).lean();
    if (!existing) return sendError(res, 'Customer not found', 404);
    if (req.user && req.user.role === 'admin') {
      if (!existing.createdBy) return sendError(res, 'You do not have permission to perform this action', 403);
      if (String(existing.createdBy) !== String(req.user._id)) {
        return sendError(res, 'You do not have permission to perform this action', 403);
      }
    }

    await CustomerProfile.deleteOne({ _id: req.params.id });
    // Also remove associated user
    if (existing.userId) await User.deleteOne({ _id: existing.userId });

    return sendSuccess(res, null, 'Customer deleted');
  } catch (err) { next(err); }
};

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await require('../models/CustomerProfile')
      .findOne({ userId: req.user._id })
      .populate('userId', 'name email')
      .lean();
    if (!profile) return sendError(res, 'Profile not found', 404);
    return sendSuccess(res, profile);
  } catch (err) { next(err); }
};

const getMySummaryMonthly = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10);
    const Transaction = require('../models/Transaction');
    
    if (!year || year < 2000 || year > 2100) {
      return sendError(res, 'Invalid year', 400);
    }

    // Get all transactions for this customer in the given year
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const transactions = await Transaction.find({
      userId: req.user._id,
      transactionDate: { $gte: startDate, $lte: endDate },
      isVoided: { $ne: true },
    }).sort({ transactionDate: 1 }).lean();

    // Aggregate by month
    const monthlyData = {};

    transactions.forEach((tx) => {
      const date = new Date(tx.transactionDate);
      const month = date.getUTCMonth() + 1; // 1-12

      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          totalFuel: 0,
          totalSales: 0,
          totalPayments: 0,
          closingBalance: 0,
        };
      }

      const bucket = monthlyData[month];
      
      // Only count fuel sales for fuel quantity and sales amount
      if (tx.transactionType === 'fuel_sale') {
        bucket.totalFuel += Number(tx.fuelQuantity) || 0;
        bucket.totalSales += Number(tx.totalAmount) || 0;
      }
      
      // Payments from all transaction types
      bucket.totalPayments += Number(tx.paymentReceived) || 0;
      
      // Update closing balance (use the last transaction's balance)
      bucket.closingBalance = Number(tx.updatedBalance) || bucket.closingBalance;
    });

    // Convert to array and fill missing months
    const result = [];
    for (let m = 1; m <= 12; m++) {
      result.push(monthlyData[m] || {
        month: m,
        totalFuel: 0,
        totalSales: 0,
        totalPayments: 0,
        closingBalance: 0,
      });
    }

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const getMySummaryYearly = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10);
    const Transaction = require('../models/Transaction');

    if (!year || year < 2000 || year > 2100) {
      return sendError(res, 'Invalid year', 400);
    }

    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const transactions = await Transaction.find({
      userId: req.user._id,
      transactionDate: { $gte: startDate, $lte: endDate },
      isVoided: { $ne: true },
    }).sort({ transactionDate: 1 }).lean();

    const monthlyData = {};
    let totalFuel = 0;
    let totalSales = 0;
    let totalPayments = 0;

    transactions.forEach((tx) => {
      const date = new Date(tx.transactionDate);
      const month = date.getUTCMonth() + 1;

      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          totalFuel: 0,
          totalSales: 0,
          totalPayments: 0,
          closingBalance: 0,
        };
      }

      const bucket = monthlyData[month];
      bucket.totalFuel += Number(tx.fuelQuantity) || 0;
      bucket.totalSales += Number(tx.totalAmount) || 0;
      bucket.totalPayments += Number(tx.paymentReceived) || 0;
      bucket.closingBalance = Number(tx.updatedBalance) || bucket.closingBalance;

      totalFuel += Number(tx.fuelQuantity) || 0;
      totalSales += Number(tx.totalAmount) || 0;
      totalPayments += Number(tx.paymentReceived) || 0;
    });

    const result = [];
    for (let m = 1; m <= 12; m += 1) {
      result.push(monthlyData[m] || {
        month: m,
        totalFuel: 0,
        totalSales: 0,
        totalPayments: 0,
        closingBalance: 0,
      });
    }

    return sendSuccess(res, {
      year,
      summary: {
        totalFuel,
        totalSales,
        totalPayments,
        closingBalance: transactions.length ? Number(transactions[transactions.length - 1].updatedBalance || 0) : 0,
      },
      breakdown: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createCustomer, getCustomers, getCustomer, updateCustomer, deleteCustomer, getMyProfile, getMySummaryMonthly, getMySummaryYearly };