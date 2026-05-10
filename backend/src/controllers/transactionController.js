'use strict';
const txService = require('../services/transactionService');
const CustomerProfile = require('../models/CustomerProfile');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const createTransaction = async (req, res, next) => {
  try {
    logger.debug({ body: req.body, user: req.user?._id }, 'CreateTransaction request');

    const {
      customerId,
      transactionType,
      fuelType,
      fuelQuantity,
      rate,
      totalAmount,
      amount,
      paymentAmount,
      paymentReceived,
      notes,
      referenceNo,
      vehicleNo,
      transactionDate,
    } = req.body;

    const resolvedAmount = totalAmount ?? amount;
    const resolvedPayment = paymentReceived ?? paymentAmount;
    const parsedPayment = Number.parseFloat(resolvedPayment);

    if (!customerId) {
      return sendError(res, 'Customer is required', 400);
    }

    // Ownership check: admin users may only act on customers they created
    if (req.user && req.user.role === 'admin') {
      const profile = await CustomerProfile.findById(customerId).lean();
      if (!profile) return sendError(res, 'Customer not found', 404);
      if (profile.createdBy && String(profile.createdBy) !== String(req.user._id)) {
        return sendError(res, 'You do not have permission to perform this action', 403);
      }
    }

    if (!transactionType) {
      return sendError(res, 'Transaction type is required', 400);
    }

    if (transactionType === 'fuel_sale') {
      if (!fuelType) {
        return sendError(res, 'Fuel type is required for fuel sale', 400);
      }

      if (!fuelQuantity || !rate) {
        return sendError(res, 'Fuel sale requires quantity and rate', 400);
      }
    } else if (['adjustment', 'credit_note', 'opening_balance'].includes(transactionType)) {
      if (resolvedAmount === undefined || resolvedAmount === null || resolvedAmount === '') {
        return sendError(res, 'Amount is required', 400);
      }
    } else if (transactionType === 'payment') {
      if (!Number.isFinite(parsedPayment) || parsedPayment <= 0) {
        return sendError(res, 'Payment received is required', 400);
      }
    }

    const tx = await txService.createTransaction({
      customerId,
      transactionType,
      fuelType,
      fuelQuantity: fuelQuantity ? parseFloat(fuelQuantity) : undefined,
      rate: rate ? parseFloat(rate) : undefined,
      totalAmount:
        resolvedAmount !== undefined && resolvedAmount !== null && resolvedAmount !== ''
          ? parseFloat(resolvedAmount)
          : undefined,
      paymentReceived: transactionType === 'payment'
        ? parsedPayment
        : (resolvedPayment !== undefined && resolvedPayment !== null && resolvedPayment !== '' && Number.isFinite(parsedPayment)
          ? parsedPayment
          : 0),
      notes: notes || '',
      referenceNo: referenceNo || '',
      vehicleNo: vehicleNo || '',
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      createdBy: req.user._id,
      requestId: req.id,
    });

    return sendSuccess(res, tx, 'Transaction recorded successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const {
      customerId,
      startDate,
      endDate,
      transactionType,
      fuelType,
      page = 1,
      limit = 20,
      sort,
    } = req.query;

      // If an admin provided a customerId, ensure ownership
      if (customerId && req.user && req.user.role === 'admin') {
        const profile = await CustomerProfile.findById(customerId).lean();
        if (!profile) return sendError(res, 'Customer not found', 404);
        if (profile.createdBy && String(profile.createdBy) !== String(req.user._id)) {
          return sendError(res, 'You do not have permission to perform this action', 403);
        }
      }

      const result = await txService.getTransactions({
      customerId,
      startDate,
      endDate,
      transactionType,
      fuelType,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort,
    });

    return sendSuccess(res, result.transactions, 'Transactions retrieved', 200, result.meta);
  } catch (err) {
    next(err);
  }
};

const getMyTransactions = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      transactionType,
      fuelType,
      page = 1,
      limit = 20,
    } = req.query;

    const result = await txService.getTransactions({
      customerId: req.customerId,
      startDate,
      endDate,
      transactionType,
      fuelType,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return sendSuccess(res, result.transactions, 'Statement retrieved', 200, result.meta);
  } catch (err) {
    next(err);
  }
};

const voidTransaction = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return sendError(res, 'Void reason is required', 400);

    const tx = await txService.voidTransaction({
      transactionId: req.params.id,
      voidedBy: req.user._id,
      voidReason: reason,
      requestId: req.id,
    });

    return sendSuccess(res, tx, 'Transaction voided successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { createTransaction, getTransactions, getMyTransactions, voidTransaction };