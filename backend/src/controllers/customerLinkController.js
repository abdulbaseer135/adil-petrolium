'use strict';
const customerLinkService = require('../services/customerLinkService');
const PetrolPump = require('../models/PetrolPump');
const notificationService = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * Customer Link Controller
 * Handles customer connection requests, admin reviews, and public pump directory.
 */

// ─── Public: Safe Approved Petrol Pumps Directory ──────────────
const getPublicPetrolPumps = async (req, res, next) => {
  try {
    const pumps = await PetrolPump.find({
      status: { $in: ['approved', 'active'] },
    })
      .select('name city province address registrationNumber')
      .sort('name')
      .lean();

    return sendSuccess(res, pumps, 'Approved petrol pumps retrieved');
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Submit Link Request ─────────────────────────────
const submitLinkRequest = async (req, res, next) => {
  try {
    const { petrolPumpId, requestType, notes } = req.body;
    const customerCode = req.body.customerCode || req.body.requestedCustomerCode;
    const phone = req.body.phone || req.body.requestedPhone;

    const result = await customerLinkService.createLinkRequest({
      customerUserId: req.user._id,
      petrolPumpId,
      requestType,
      customerCode,
      phone,
      notes,
      requestId: req.id,
    });

    // Notify pump admin(s) about the new connection request
    const pump = await PetrolPump.findById(petrolPumpId).select('name').lean();
    notificationService.onCustomerLinkRequest({
      petrolPumpId,
      customerName: req.user.name || 'A customer',
      pumpName: pump?.name || 'your station',
    });

    return sendSuccess(res, result.data, result.message, 201);
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Get Own Link Requests ───────────────────────────
const getMyLinkRequests = async (req, res, next) => {
  try {
    const requests = await customerLinkService.getCustomerLinkRequests(req.user._id);
    return sendSuccess(res, requests, 'Customer link requests retrieved');
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Cancel Pending Request ──────────────────────────
const cancelLinkRequest = async (req, res, next) => {
  try {
    const result = await customerLinkService.cancelCustomerLinkRequest(
      req.params.id,
      req.user._id
    );
    return sendSuccess(res, null, result.message);
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Get Petrol Pump Link Requests ──────────────────────
const getAdminLinkRequests = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;

    const result = await customerLinkService.getAdminLinkRequests({
      petrolPumpId: req.petrolPumpId,
      status,
      page,
      limit,
    });

    return sendSuccess(res, {
      requests: result.requests,
      pendingCount: result.pendingCount,
    }, 'Customer link requests retrieved', 200, result.meta);
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Approve Link Request ───────────────────────────────
const approveLinkRequest = async (req, res, next) => {
  try {
    const result = await customerLinkService.approveLinkRequest({
      requestId: req.params.id,
      petrolPumpId: req.petrolPumpId,
      reviewedBy: req.user._id,
      accountData: req.body,
      auditRequestId: req.id,
    });

    const responseData = result.request?.toObject ? result.request.toObject() : result.request;

    // Notify customer that their link request was approved
    if (result.request?.customerUserId) {
      const pump = await PetrolPump.findById(req.petrolPumpId).select('name').lean();
      notificationService.onLinkRequestApproved({
        customerUserId: result.request.customerUserId,
        pumpName: pump?.name || 'a petrol pump',
      });
    }

    return sendSuccess(res, { ...responseData, account: result.account }, 'Customer link request approved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Reject Link Request ────────────────────────────────
const rejectLinkRequest = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;

    const result = await customerLinkService.rejectLinkRequest({
      requestId: req.params.id,
      petrolPumpId: req.petrolPumpId,
      reviewedBy: req.user._id,
      rejectionReason,
      auditRequestId: req.id,
    });

    const responseData = result.request?.toObject ? result.request.toObject() : result.request;

    // Notify customer that their link request was rejected
    if (result.request?.customerUserId) {
      const pump = await PetrolPump.findById(req.petrolPumpId).select('name').lean();
      notificationService.onLinkRequestRejected({
        customerUserId: result.request.customerUserId,
        pumpName: pump?.name || 'a petrol pump',
        reason: rejectionReason || '',
      });
    }

    return sendSuccess(res, responseData, 'Customer link request rejected');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicPetrolPumps,
  submitLinkRequest,
  getMyLinkRequests,
  cancelLinkRequest,
  getAdminLinkRequests,
  approveLinkRequest,
  rejectLinkRequest,
};
