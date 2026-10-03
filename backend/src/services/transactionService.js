'use strict';
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const CustomerPumpAccount = require('../models/CustomerPumpAccount');
const { createAuditLog } = require('./auditService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { sendEvent } = require('../utils/sse');

const FUEL_TYPES = ['pmg', 'hsd', 'nr'];
const PK_UTC_OFFSET_HOURS = 5;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const toPkRangeStartUtc = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, -PK_UTC_OFFSET_HOURS, 0, 0, 0));
};

const toPkRangeEndUtc = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23 - PK_UTC_OFFSET_HOURS, 59, 59, 999));
};

const normalizeMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
};

const computeTotal = ({ transactionType, fuelQuantity, rate, amount }) => {
  if (transactionType === 'fuel_sale') {
    if (!fuelQuantity || !rate) {
      throw new AppError('Fuel sale requires quantity and rate', 400);
    }
    return normalizeMoney(fuelQuantity * rate);
  }

  if (transactionType === 'credit_note') {
    if (amount === undefined || amount === null || amount === '') {
      throw new AppError('Amount is required for this transaction type', 400);
    }
    const n = normalizeMoney(amount);
    if (n < 0) throw new AppError('Amount must be zero or greater', 400);
    return -n;
  }

  if (['adjustment', 'opening_balance'].includes(transactionType)) {
    if (amount === undefined || amount === null || amount === '') {
      throw new AppError('Amount is required for this transaction type', 400);
    }
    return normalizeMoney(amount);
  }

  if (transactionType === 'payment') {
    return 0;
  }

  throw new AppError('Invalid transaction type', 400);
};

const validatePayload = ({ transactionType, fuelType, paymentReceived, totalAmount }) => {
  if (transactionType === 'fuel_sale' && !FUEL_TYPES.includes(fuelType)) {
    throw new AppError('Fuel type is required for fuel sale', 400);
  }

  if (transactionType !== 'fuel_sale' && fuelType) {
    throw new AppError('Fuel type is only allowed for fuel sale', 400);
  }

  if (transactionType === 'payment' && (!paymentReceived || Number(paymentReceived) <= 0)) {
    throw new AppError('Payment transaction requires payment received amount', 400);
  }

  if (['adjustment', 'opening_balance'].includes(transactionType) && Number(totalAmount) < 0) {
    throw new AppError('Amount must be zero or greater', 400);
  }
};

const createTransaction = async ({
  petrolPumpId,
  customerId,
  transactionType,
  fuelType,
  fuelQuantity,
  rate,
  amount,
  totalAmount,
  paymentReceived = 0,
  notes,
  referenceNo,
  vehicleNo,
  transactionDate,
  createdBy,
  requestId,
}) => {
  const session = await mongoose.startSession();

  try {
    let tx;
    let previousBalance;
    let updatedBalance;
    let finalAmount;
    let paymentReceivedAmount;
    let targetPumpId;

    try {
      await session.withTransaction(async () => {
        const profile = await CustomerPumpAccount.findById(customerId)
          .populate('customerUserId', 'name email')
          .session(session);

        if (!profile) throw new AppError('Customer not found', 404);

        if (petrolPumpId && String(profile.petrolPumpId) !== String(petrolPumpId)) {
          throw new AppError('Customer does not belong to this petrol pump', 403);
        }
        targetPumpId = petrolPumpId || profile.petrolPumpId;

        // Prevent all transaction types for inactive customers
        if (!profile.isActive || profile.status === 'inactive' || profile.status === 'suspended') {
          throw new AppError('Cannot create entries for inactive customers. Please activate the customer first.', 400);
        }

        const rawAmount =
          totalAmount !== undefined && totalAmount !== null && totalAmount !== ''
            ? totalAmount
            : amount;
        finalAmount = computeTotal({
          transactionType,
          fuelQuantity,
          rate,
          amount: rawAmount,
        });

        validatePayload({
          transactionType,
          fuelType,
          paymentReceived,
          totalAmount: finalAmount,
        });

        previousBalance = normalizeMoney(profile.currentBalance || 0);
        paymentReceivedAmount = normalizeMoney(paymentReceived || 0);
        updatedBalance = normalizeMoney(previousBalance + finalAmount - paymentReceivedAmount);

        // Credit limit validation for fuel sales
        if (transactionType === 'fuel_sale' && profile.creditLimit > 0) {
          if (updatedBalance > profile.creditLimit) {
            throw new AppError(
              `Credit limit exceeded. Current limit: PKR ${profile.creditLimit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}. Would result in: PKR ${updatedBalance.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`,
              400
            );
          }
        }

        const userRef = profile.customerUserId?._id || profile.userId?._id || profile.customerUserId || profile.userId;

        [tx] = await Transaction.create([{
          petrolPumpId: targetPumpId,
          customerId,
          customerAccountId: customerId,
          userId: userRef || undefined,
          transactionType,
          fuelType: transactionType === 'fuel_sale' ? fuelType : undefined,
          fuelQuantity: fuelQuantity ? normalizeMoney(fuelQuantity) : undefined,
          rate: rate ? normalizeMoney(rate) : undefined,
          totalAmount: finalAmount,
          paymentReceived: paymentReceivedAmount,
          previousBalance,
          updatedBalance,
          transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          notes: notes || '',
          referenceNo: referenceNo || '',
          vehicleNo: vehicleNo || '',
          createdBy,
        }], { session });

        await CustomerPumpAccount.findByIdAndUpdate(customerId, {
          currentBalance: updatedBalance,
        }, { session });
      });
    } catch (err) {
      if (String(err.message).toLowerCase().includes('transactions') || String(err.message).toLowerCase().includes('replica set')) {
        logger.warn({ err: err.message }, 'Transactions not supported; falling back to non-transactional write');

        const profile = await CustomerPumpAccount.findById(customerId).populate('customerUserId', 'name email');
        if (!profile) throw new AppError('Customer not found', 404);

        if (petrolPumpId && String(profile.petrolPumpId) !== String(petrolPumpId)) {
          throw new AppError('Customer does not belong to this petrol pump', 403);
        }
        targetPumpId = petrolPumpId || profile.petrolPumpId;

        if (!profile.isActive || profile.status === 'inactive' || profile.status === 'suspended') {
          throw new AppError('Cannot create entries for inactive customers. Please activate the customer first.', 400);
        }

        const rawAmount =
          totalAmount !== undefined && totalAmount !== null && totalAmount !== ''
            ? totalAmount
            : amount;
        finalAmount = computeTotal({
          transactionType,
          fuelQuantity,
          rate,
          amount: rawAmount,
        });

        validatePayload({
          transactionType,
          fuelType,
          paymentReceived,
          totalAmount: finalAmount,
        });

        paymentReceivedAmount = normalizeMoney(paymentReceived || 0);
        const balanceDelta = normalizeMoney(finalAmount - paymentReceivedAmount);

        // Atomic update with credit limit enforcement
        let updatedAccount;
        if (transactionType === 'fuel_sale' && profile.creditLimit > 0 && balanceDelta > 0) {
          const maxAllowedCurrent = normalizeMoney(profile.creditLimit - balanceDelta);
          updatedAccount = await CustomerPumpAccount.findOneAndUpdate(
            { _id: customerId, currentBalance: { $lte: maxAllowedCurrent } },
            { $inc: { currentBalance: balanceDelta } },
            { new: true }
          );
          if (!updatedAccount) {
            const currentAcc = await CustomerPumpAccount.findById(customerId);
            const wouldBe = currentAcc ? normalizeMoney(currentAcc.currentBalance + balanceDelta) : profile.creditLimit + 1;
            throw new AppError(
              `Credit limit exceeded. Current limit: PKR ${profile.creditLimit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}. Would result in: PKR ${wouldBe.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`,
              400
            );
          }
        } else {
          updatedAccount = await CustomerPumpAccount.findByIdAndUpdate(
            customerId,
            { $inc: { currentBalance: balanceDelta } },
            { new: true }
          );
        }

        updatedBalance = normalizeMoney(updatedAccount.currentBalance);
        previousBalance = normalizeMoney(updatedBalance - balanceDelta);

        const userRef = profile.customerUserId?._id || profile.userId?._id || profile.customerUserId || profile.userId;

        try {
          tx = await Transaction.create({
            petrolPumpId: targetPumpId,
            customerId,
            customerAccountId: customerId,
            userId: userRef || undefined,
            transactionType,
            fuelType: transactionType === 'fuel_sale' ? fuelType : undefined,
            fuelQuantity: fuelQuantity ? normalizeMoney(fuelQuantity) : undefined,
            rate: rate ? normalizeMoney(rate) : undefined,
            totalAmount: finalAmount,
            paymentReceived: paymentReceivedAmount,
            previousBalance,
            updatedBalance,
            transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
            notes: notes || '',
            referenceNo: referenceNo || '',
            vehicleNo: vehicleNo || '',
            createdBy,
          });
        } catch (createErr) {
          await CustomerPumpAccount.findByIdAndUpdate(customerId, { $inc: { currentBalance: -balanceDelta } });
          throw createErr;
        }
      } else {
        throw err;
      }
    }

    logger.info({
      txId: tx._id,
      petrolPumpId: targetPumpId,
      customerId,
      transactionType,
      fuelType,
      finalAmount,
      paymentReceived,
      previousBalance,
      updatedBalance,
    }, 'Transaction created');

    // Notify connected SSE clients for this customer
    try {
      sendEvent(customerId, 'transaction.created', {
        txId: tx._id,
        petrolPumpId: targetPumpId,
        transactionType,
        totalAmount: finalAmount,
        paymentReceived,
        previousBalance,
        updatedBalance,
        transactionDate: tx.transactionDate,
      });
    } catch (e) {
      logger.warn({ err: e }, 'SSE sendEvent failed for transaction created');
    }

    createAuditLog({
      petrolPumpId: targetPumpId,
      action: 'TRANSACTION_CREATED',
      actor: createdBy,
      targetId: tx._id,
      targetModel: 'Transaction',
      targetType: 'Transaction',
      details: {
        customerId,
        transactionType,
        fuelType,
        totalAmount: finalAmount,
        paymentReceived,
        previousBalance,
        updatedBalance,
      },
      requestId,
    }).catch((err) => logger.warn({ err, txId: tx._id }, 'Audit log failed for transaction creation'));

    return tx;
  } finally {
    session.endSession();
  }
};

const voidTransaction = async ({ petrolPumpId, transactionId, voidedBy, voidReason, requestId }) => {
  const session = await mongoose.startSession();

  try {
    let tx;
    let reversedBalance;

    try {
      await session.withTransaction(async () => {
        const query = { _id: transactionId };
        if (petrolPumpId) query.petrolPumpId = petrolPumpId;

        tx = await Transaction.findOne(query).session(session);
        if (!tx) throw new AppError('Transaction not found or access denied', 404);
        if (tx.isVoided) throw new AppError('Transaction already voided', 400);

        const profile = await CustomerPumpAccount.findById(tx.customerId).session(session);
        if (!profile) throw new AppError('Customer account not found', 404);

        reversedBalance = normalizeMoney(
          profile.currentBalance - tx.totalAmount + tx.paymentReceived
        );

        await Transaction.findByIdAndUpdate(transactionId, {
          isVoided: true,
          voidedBy,
          voidedAt: new Date(),
          voidReason,
        }, { session });

        await CustomerPumpAccount.findByIdAndUpdate(tx.customerId, {
          currentBalance: reversedBalance,
        }, { session });
      });
    } catch (err) {
      if (String(err.message).toLowerCase().includes('transactions') || String(err.message).toLowerCase().includes('replica set')) {
        logger.warn({ err: err.message }, 'Transactions not supported; falling back to non-transactional void');

        const query = { _id: transactionId };
        if (petrolPumpId) query.petrolPumpId = petrolPumpId;

        tx = await Transaction.findOne(query);
        if (!tx) throw new AppError('Transaction not found or access denied', 404);
        if (tx.isVoided) throw new AppError('Transaction already voided', 400);

        const profile = await CustomerPumpAccount.findById(tx.customerId);
        if (!profile) throw new AppError('Customer account not found', 404);

        const reverseDelta = normalizeMoney(- tx.totalAmount + tx.paymentReceived);
        const updatedAcc = await CustomerPumpAccount.findByIdAndUpdate(
          tx.customerId,
          { $inc: { currentBalance: reverseDelta } },
          { new: true }
        );
        reversedBalance = normalizeMoney(updatedAcc.currentBalance);

        await Transaction.findByIdAndUpdate(transactionId, {
          isVoided: true,
          voidedBy,
          voidedAt: new Date(),
          voidReason,
        });
      } else {
        throw err;
      }
    }

    logger.info({ transactionId, voidedBy, reversedBalance }, 'Transaction voided');

    try {
      sendEvent(tx.customerId, 'transaction.voided', {
        txId: tx._id,
        transactionId,
        reversedBalance,
      });
    } catch (e) {
      logger.warn({ err: e }, 'SSE sendEvent failed for transaction voided');
    }

    createAuditLog({
      petrolPumpId: tx.petrolPumpId,
      action: 'TRANSACTION_VOIDED',
      actor: voidedBy,
      targetId: transactionId,
      targetModel: 'Transaction',
      targetType: 'Transaction',
      details: { voidReason, reversedBalance },
      requestId,
    }).catch((err) => logger.warn({ err, transactionId }, 'Audit log failed for transaction voiding'));

    return Transaction.findById(transactionId).lean();
  } finally {
    session.endSession();
  }
};

const getTransactions = async ({
  petrolPumpId,
  customerId,
  startDate,
  endDate,
  transactionType,
  fuelType,
  isVoided = false,
  page = 1,
  limit = 20,
  sort = '-transactionDate',
}) => {
  const query = { isVoided };

  if (petrolPumpId) query.petrolPumpId = petrolPumpId;
  if (customerId) query.customerId = customerId;
  if (transactionType) query.transactionType = transactionType;
  if (fuelType) query.fuelType = fuelType;

  if (startDate || endDate) {
    query.transactionDate = {};
    if (startDate) {
      query.transactionDate.$gte = DATE_ONLY_RE.test(startDate)
        ? toPkRangeStartUtc(startDate)
        : new Date(startDate);
    }
    if (endDate) {
      query.transactionDate.$lte = DATE_ONLY_RE.test(endDate)
        ? toPkRangeEndUtc(endDate)
        : (() => {
            const e = new Date(endDate);
            e.setHours(23, 59, 59, 999);
            return e;
          })();
    }
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const total = await Transaction.countDocuments(query);

  const transactions = await Transaction.find(query)
    .populate('createdBy', 'name')
    .populate({
      path: 'customerId',
      select: 'customerCode customerName currentBalance address phone',
      populate: { path: 'userId', select: 'name email' },
    })
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit, 10))
    .lean();

  return {
    transactions,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

module.exports = { createTransaction, voidTransaction, getTransactions };