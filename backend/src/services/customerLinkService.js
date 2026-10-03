'use strict';
const mongoose = require('mongoose');
const CustomerLinkRequest = require('../models/CustomerLinkRequest');
const CustomerPumpAccount = require('../models/CustomerPumpAccount');
const PetrolPump = require('../models/PetrolPump');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { createAuditLog } = require('./auditService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Customer Link Service
 * 
 * Manages the lifecycle of customer-to-petrol-pump connection requests.
 * Separates user login identity from pump-specific financial accounts.
 */

// ─── Customer: Create Link Request ─────────────────────────────
const createLinkRequest = async ({
  customerUserId,
  petrolPumpId,
  requestType = 'existing_account',
  customerCode,
  phone,
  notes,
  requestId,
}) => {
  if (!petrolPumpId) throw new AppError('Petrol pump ID is required', 400);

  const pump = await PetrolPump.findById(petrolPumpId).lean();
  if (!pump || !['approved', 'active'].includes(pump.status)) {
    throw new AppError('Petrol pump not found or not active', 404);
  }

  // Check if customer already has an active linked account with this pump
  const existingActiveAccount = await CustomerPumpAccount.findOne({
    petrolPumpId,
    $or: [{ customerUserId }, { userId: customerUserId }],
    isActive: true,
  });
  if (existingActiveAccount) {
    throw new AppError('You already have an active account with this petrol pump.', 400);
  }

  // Check if there is already a pending request from this customer for this pump
  const pendingRequest = await CustomerLinkRequest.findOne({
    customerUserId,
    petrolPumpId,
    status: 'pending',
  });
  if (pendingRequest) {
    throw new AppError('You already have a pending request for this petrol pump.', 400);
  }

  if (requestType === 'existing_account') {
    if (!customerCode || !customerCode.trim()) {
      throw new AppError('Customer code is required to link an existing account.', 400);
    }

    const formattedCode = customerCode.trim().toUpperCase();

    // Look up the pump-specific customer account
    const account = await CustomerPumpAccount.findOne({
      petrolPumpId,
      customerCode: formattedCode,
    });

    if (!account) {
      throw new AppError(
        'No matching account found with that customer code at this petrol pump. You may submit a request for a new relationship instead.',
        404
      );
    }

    // Check if account is already linked to another online user
    if (account.customerUserId && String(account.customerUserId) !== String(customerUserId)) {
      throw new AppError(
        'This customer account is already linked to another online user. Please contact the station manager.',
        409
      );
    }

    const linkRequest = await CustomerLinkRequest.create({
      customerUserId,
      petrolPumpId,
      customerPumpAccountId: account._id,
      requestType: 'existing_account',
      requestedCustomerCode: formattedCode,
      requestedPhone: phone ? phone.trim() : '',
      notes: notes ? notes.trim() : '',
      status: 'pending',
      requestedAt: new Date(),
    });

    await createAuditLog({
      petrolPumpId,
      action: 'CUSTOMER_PUMP_LINK_REQUESTED',
      actor: customerUserId,
      actorRole: 'customer',
      targetId: linkRequest._id,
      targetModel: 'CustomerLinkRequest',
      details: {
        requestType: 'existing_account',
        customerCode: formattedCode,
        pumpName: pump.name,
      },
      requestId,
    });

    logger.info(
      { userId: customerUserId, pumpId: petrolPumpId, requestId: linkRequest._id },
      'Customer requested link to existing pump account'
    );

    // CRITICAL: Return safe confirmation without disclosing financial or private information
    return {
      success: true,
      message: 'Account found. Your connection request has been sent to the petrol pump for approval.',
      data: {
        _id: linkRequest._id,
        id: linkRequest._id,
        requestId: linkRequest._id,
        pumpName: pump.name,
        status: 'pending',
      },
    };
  }

  // New relationship request
  const linkRequest = await CustomerLinkRequest.create({
    customerUserId,
    petrolPumpId,
    customerPumpAccountId: null,
    requestType: 'new_relationship',
    requestedPhone: phone ? phone.trim() : '',
    notes: notes ? notes.trim() : '',
    status: 'pending',
    requestedAt: new Date(),
  });

  await createAuditLog({
    petrolPumpId,
    action: 'CUSTOMER_PUMP_LINK_REQUESTED',
    actor: customerUserId,
    actorRole: 'customer',
    targetId: linkRequest._id,
    targetModel: 'CustomerLinkRequest',
    details: {
      requestType: 'new_relationship',
      pumpName: pump.name,
    },
    requestId,
  });

  logger.info(
    { userId: customerUserId, pumpId: petrolPumpId, requestId: linkRequest._id },
    'Customer requested new pump relationship'
  );

  return {
    success: true,
    message: 'Your request for a new customer relationship has been submitted for approval.',
    data: {
      _id: linkRequest._id,
      id: linkRequest._id,
      requestId: linkRequest._id,
      pumpName: pump.name,
      status: 'pending',
    },
  };
};

// ─── Customer: List Link Requests ──────────────────────────────
const getCustomerLinkRequests = async (customerUserId) => {
  const requests = await CustomerLinkRequest.find({ customerUserId })
    .populate('petrolPumpId', 'name city province address businessPhone status')
    .populate('customerPumpAccountId', 'customerCode customerName status currentBalance')
    .sort('-createdAt')
    .lean();

  return requests;
};

// ─── Customer: Cancel Pending Request ──────────────────────────
const cancelCustomerLinkRequest = async (requestId, customerUserId) => {
  const request = await CustomerLinkRequest.findOne({
    _id: requestId,
    customerUserId,
    status: 'pending',
  });

  if (!request) {
    throw new AppError('Pending link request not found or already reviewed.', 404);
  }

  request.status = 'cancelled';
  await request.save();

  return {
    success: true,
    message: 'Link request cancelled successfully.',
  };
};

// ─── Admin: List Pump Link Requests ────────────────────────────
const getAdminLinkRequests = async ({
  petrolPumpId,
  status,
  page = 1,
  limit = 20,
}) => {
  if (!petrolPumpId) throw new AppError('Petrol pump ID is required', 400);

  const query = { petrolPumpId };
  if (status && status !== 'all') {
    query.status = status;
  }

  const parsedPage = Math.max(1, parseInt(page, 10));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (parsedPage - 1) * parsedLimit;

  const [requests, total, pendingCount] = await Promise.all([
    CustomerLinkRequest.find(query)
      .populate('customerUserId', 'name email phone')
      .populate('customerPumpAccountId', 'customerCode customerName phone currentBalance creditLimit status vehicleInfo address')
      .sort(status === 'pending' ? { createdAt: -1 } : { updatedAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    CustomerLinkRequest.countDocuments(query),
    CustomerLinkRequest.countDocuments({ petrolPumpId, status: 'pending' }),
  ]);

  return {
    requests,
    pendingCount,
    meta: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1,
    },
  };
};

// ─── Admin: Approve Link Request ───────────────────────────────
const approveLinkRequest = async ({
  requestId,
  petrolPumpId,
  reviewedBy,
  accountData = {},
  auditRequestId,
}) => {
  if (!petrolPumpId) throw new AppError('Petrol pump ID is required', 400);

  const linkRequest = await CustomerLinkRequest.findOne({
    _id: requestId,
    petrolPumpId,
    status: 'pending',
  });

  if (!linkRequest) {
    throw new AppError('Pending link request not found.', 404);
  }

  const customerUser = await User.findById(linkRequest.customerUserId).lean();
  if (!customerUser) {
    throw new AppError('Requesting customer user no longer exists.', 404);
  }

  let pumpAccount = null;

  if (linkRequest.requestType === 'existing_account') {
    pumpAccount = await CustomerPumpAccount.findOne({
      _id: linkRequest.customerPumpAccountId,
      petrolPumpId,
    });

    if (!pumpAccount) {
      throw new AppError('Associated customer account not found at this petrol pump.', 404);
    }

    if (pumpAccount.customerUserId && String(pumpAccount.customerUserId) !== String(linkRequest.customerUserId)) {
      throw new AppError('This account has already been linked to another customer.', 409);
    }

    pumpAccount.customerUserId = linkRequest.customerUserId;
    pumpAccount.userId = linkRequest.customerUserId;
    pumpAccount.status = 'active';
    pumpAccount.isActive = true;
    pumpAccount.linkedAt = new Date();
    if (!pumpAccount.customerName) pumpAccount.customerName = customerUser.name;
    if (!pumpAccount.phone && linkRequest.requestedPhone) pumpAccount.phone = linkRequest.requestedPhone;

    await pumpAccount.save();

    linkRequest.status = 'approved';
    linkRequest.reviewedBy = reviewedBy;
    linkRequest.reviewedAt = new Date();
    await linkRequest.save();

    await createAuditLog({
      petrolPumpId,
      action: 'CUSTOMER_PUMP_LINK_APPROVED',
      actor: reviewedBy,
      actorRole: 'admin',
      targetId: pumpAccount._id,
      targetModel: 'CustomerPumpAccount',
      details: {
        requestId: linkRequest._id,
        customerUserId: linkRequest.customerUserId,
        customerCode: pumpAccount.customerCode,
      },
      requestId: auditRequestId,
    });

    logger.info(
      { adminId: reviewedBy, pumpId: petrolPumpId, accountId: pumpAccount._id, userId: linkRequest.customerUserId },
      'Existing customer account link request approved'
    );

    return {
      request: linkRequest,
      account: pumpAccount,
    };
  }

  // ─── Case: new_relationship ──────────────────────────────────
  const customerCode = accountData.customerCode
    ? accountData.customerCode.trim().toUpperCase()
    : `CUST-${Math.floor(1000 + Math.random() * 9000)}`;

  // Verify unique customerCode at this pump
  const duplicate = await CustomerPumpAccount.findOne({ petrolPumpId, customerCode });
  if (duplicate) {
    throw new AppError(`Customer code "${customerCode}" already exists at this petrol pump.`, 409);
  }

  pumpAccount = await CustomerPumpAccount.create({
    petrolPumpId,
    customerUserId: linkRequest.customerUserId,
    userId: linkRequest.customerUserId,
    customerCode,
    customerName: (accountData.customerName || customerUser.name || 'New Customer').trim(),
    phone: (accountData.phone || linkRequest.requestedPhone || customerUser.phone || '').trim(),
    address: (accountData.address || '').trim(),
    vehicleInfo: (accountData.vehicleInfo || '').trim(),
    creditLimit: Number(accountData.creditLimit) || 0,
    currentBalance: Number(accountData.openingBalance) || 0,
    status: 'active',
    isActive: true,
    linkedAt: new Date(),
    createdBy: reviewedBy,
  });

  if (accountData.openingBalance && Number(accountData.openingBalance) > 0) {
    try {
      await Transaction.create({
        petrolPumpId,
        customerId: pumpAccount._id,
        customerAccountId: pumpAccount._id,
        userId: linkRequest.customerUserId,
        transactionType: 'opening_balance',
        totalAmount: Number(accountData.openingBalance),
        previousBalance: 0,
        updatedBalance: Number(accountData.openingBalance),
        paymentReceived: 0,
        notes: 'Initial opening balance on new relationship approval',
        createdBy: reviewedBy,
      });
    } catch (err) {
      await CustomerPumpAccount.deleteOne({ _id: pumpAccount._id });
      throw err;
    }
  }

  linkRequest.customerPumpAccountId = pumpAccount._id;
  linkRequest.status = 'approved';
  linkRequest.reviewedBy = reviewedBy;
  linkRequest.reviewedAt = new Date();
  await linkRequest.save();

  await createAuditLog({
    petrolPumpId,
    action: 'CUSTOMER_PUMP_LINK_APPROVED',
    actor: reviewedBy,
    actorRole: 'admin',
    targetId: pumpAccount._id,
    targetModel: 'CustomerPumpAccount',
    details: {
      requestId: linkRequest._id,
      requestType: 'new_relationship',
      customerUserId: linkRequest.customerUserId,
      customerCode: pumpAccount.customerCode,
    },
    requestId: auditRequestId,
  });

  logger.info(
    { adminId: reviewedBy, pumpId: petrolPumpId, accountId: pumpAccount._id, userId: linkRequest.customerUserId },
    'New relationship approved and customer account created'
  );

  return {
    request: linkRequest,
    account: pumpAccount,
  };
};

// ─── Admin: Reject Link Request ────────────────────────────────
const rejectLinkRequest = async ({
  requestId,
  petrolPumpId,
  reviewedBy,
  rejectionReason = '',
  auditRequestId,
}) => {
  if (!petrolPumpId) throw new AppError('Petrol pump ID is required', 400);

  const linkRequest = await CustomerLinkRequest.findOne({
    _id: requestId,
    petrolPumpId,
    status: 'pending',
  });

  if (!linkRequest) {
    throw new AppError('Pending link request not found.', 404);
  }

  linkRequest.status = 'rejected';
  linkRequest.rejectionReason = rejectionReason ? rejectionReason.trim() : 'Request declined by station manager';
  linkRequest.reviewedBy = reviewedBy;
  linkRequest.reviewedAt = new Date();
  await linkRequest.save();

  await createAuditLog({
    petrolPumpId,
    action: 'CUSTOMER_PUMP_LINK_REJECTED',
    actor: reviewedBy,
    actorRole: 'admin',
    targetId: linkRequest._id,
    targetModel: 'CustomerLinkRequest',
    details: {
      requestId: linkRequest._id,
      customerUserId: linkRequest.customerUserId,
      rejectionReason: linkRequest.rejectionReason,
    },
    requestId: auditRequestId,
  });

  logger.info(
    { adminId: reviewedBy, pumpId: petrolPumpId, requestId: linkRequest._id },
    'Customer link request rejected'
  );

  return {
    request: linkRequest,
  };
};

module.exports = {
  createLinkRequest,
  getCustomerLinkRequests,
  cancelCustomerLinkRequest,
  getAdminLinkRequests,
  approveLinkRequest,
  rejectLinkRequest,
};
