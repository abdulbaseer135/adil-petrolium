'use strict';
const User = require('../models/User');
const PetrolPump = require('../models/PetrolPump');
const CustomerPumpAccount = require('../models/CustomerPumpAccount');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { createAuditLog } = require('../services/auditService');
const logger = require('../utils/logger');

const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalPetrolPumps,
      pendingApprovals,
      activePumps,
      suspendedPumps,
      rejectedPumps,
      totalAdmins,
      totalCustomers,
      totalTransactions,
      pendingPumpsList,
      recentAuditLogs,
    ] = await Promise.all([
      PetrolPump.countDocuments(),
      PetrolPump.countDocuments({ status: 'pending' }),
      PetrolPump.countDocuments({ status: { $in: ['approved', 'active'] } }),
      PetrolPump.countDocuments({ status: 'suspended' }),
      PetrolPump.countDocuments({ status: 'rejected' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'customer' }),
      Transaction.countDocuments({ isVoided: { $ne: true } }),
      PetrolPump.find({ status: 'pending' })
        .sort('-createdAt')
        .populate('ownerAdminId', 'name email phone status')
        .lean(),
      AuditLog.find()
        .sort('-createdAt')
        .limit(10)
        .populate('actor', 'name email role')
        .populate('petrolPumpId', 'name city')
        .lean(),
    ]);

    const overview = {
      totalPetrolPumps,
      pendingApprovals,
      activePumps,
      approvedPetrolPumps: activePumps,
      suspendedPumps,
      rejectedPumps,
      totalAdmins,
      totalCustomers,
      totalTransactions,
    };

    return sendSuccess(res, {
      overview,
      stats: {
        totalPumps: totalPetrolPumps,
        pendingPumps: pendingApprovals,
        approvedPumps: activePumps,
        suspendedPumps,
        rejectedPumps,
        totalAdmins,
        totalCustomers,
        totalTransactions,
      },
      pendingPumps: pendingPumpsList,
      recentActivity: recentAuditLogs,
      recentPumps: pendingPumpsList,
      recentAuditLogs,
    }, 'Super admin dashboard metrics retrieved');
  } catch (err) {
    next(err);
  }
};

const getPetrolPumps = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
        { businessEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const [pumps, total] = await Promise.all([
      PetrolPump.find(query)
        .populate('ownerAdminId', 'name email phone status')
        .populate('admins', 'name email phone status')
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      PetrolPump.countDocuments(query),
    ]);

    return sendSuccess(res, pumps, 'Petrol pumps retrieved', 200, {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    next(err);
  }
};

const getPetrolPumpDetail = async (req, res, next) => {
  try {
    const pump = await PetrolPump.findById(req.params.id)
      .populate('ownerAdminId', 'name email phone status')
      .populate('admins', 'name email phone status')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .populate('suspendedBy', 'name email')
      .lean();

    if (!pump) return sendError(res, 'Petrol pump not found', 404);

    const [customerCount, transactionCount] = await Promise.all([
      CustomerPumpAccount.countDocuments({ petrolPumpId: pump._id }),
      Transaction.countDocuments({ petrolPumpId: pump._id, isVoided: { $ne: true } }),
    ]);

    return sendSuccess(res, {
      ...pump,
      metrics: {
        customerCount,
        transactionCount,
      },
    }, 'Petrol pump details retrieved');
  } catch (err) {
    next(err);
  }
};

const approvePetrolPump = async (req, res, next) => {
  try {
    const pump = await PetrolPump.findById(req.params.id);
    if (!pump) return sendError(res, 'Petrol pump not found', 404);

    pump.status = 'approved';
    pump.approvedBy = req.user._id;
    pump.approvedAt = new Date();
    pump.rejectionReason = '';
    pump.suspensionReason = '';
    await pump.save();

    // Activate owner and admins
    const adminIds = [pump.ownerAdminId, ...(pump.admins || [])].filter(Boolean);
    await User.updateMany(
      { _id: { $in: adminIds } },
      { $set: { status: 'approved', isActive: true, petrolPumpId: pump._id } }
    );

    await createAuditLog({
      petrolPumpId: pump._id,
      action: 'SUPER_ADMIN_PUMP_APPROVED',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: 'super_admin',
      targetId: pump._id,
      targetModel: 'PetrolPump',
      details: { pumpName: pump.name },
      requestId: req.id,
    });

    logger.info({ pumpId: pump._id, superAdminId: req.user._id }, 'Petrol pump approved');

    return sendSuccess(res, pump, 'Petrol pump has been approved and activated');
  } catch (err) {
    next(err);
  }
};

const rejectPetrolPump = async (req, res, next) => {
  try {
    const { reason = 'Application does not meet platform requirements' } = req.body;
    const pump = await PetrolPump.findById(req.params.id);
    if (!pump) return sendError(res, 'Petrol pump not found', 404);

    pump.status = 'rejected';
    pump.rejectedBy = req.user._id;
    pump.rejectedAt = new Date();
    pump.rejectionReason = reason;
    await pump.save();

    const adminIds = [pump.ownerAdminId, ...(pump.admins || [])].filter(Boolean);
    await User.updateMany(
      { _id: { $in: adminIds } },
      { $set: { status: 'rejected' } }
    );

    await createAuditLog({
      petrolPumpId: pump._id,
      action: 'SUPER_ADMIN_PUMP_REJECTED',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: 'super_admin',
      targetId: pump._id,
      targetModel: 'PetrolPump',
      details: { pumpName: pump.name, reason },
      requestId: req.id,
    });

    logger.info({ pumpId: pump._id, reason }, 'Petrol pump rejected');

    return sendSuccess(res, pump, 'Petrol pump registration rejected');
  } catch (err) {
    next(err);
  }
};

const suspendPetrolPump = async (req, res, next) => {
  try {
    const { reason = 'Suspended by Super Admin' } = req.body;
    const pump = await PetrolPump.findById(req.params.id);
    if (!pump) return sendError(res, 'Petrol pump not found', 404);

    pump.status = 'suspended';
    pump.suspendedBy = req.user._id;
    pump.suspendedAt = new Date();
    pump.suspensionReason = reason;
    await pump.save();

    const adminIds = [pump.ownerAdminId, ...(pump.admins || [])].filter(Boolean);
    await User.updateMany(
      { _id: { $in: adminIds } },
      { $set: { status: 'suspended' } }
    );

    await createAuditLog({
      petrolPumpId: pump._id,
      action: 'SUPER_ADMIN_PUMP_SUSPENDED',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: 'super_admin',
      targetId: pump._id,
      targetModel: 'PetrolPump',
      details: { pumpName: pump.name, reason },
      requestId: req.id,
    });

    logger.info({ pumpId: pump._id, reason }, 'Petrol pump suspended');

    return sendSuccess(res, pump, 'Petrol pump suspended');
  } catch (err) {
    next(err);
  }
};

const reactivatePetrolPump = async (req, res, next) => {
  try {
    const pump = await PetrolPump.findById(req.params.id);
    if (!pump) return sendError(res, 'Petrol pump not found', 404);

    pump.status = 'approved';
    pump.suspensionReason = '';
    await pump.save();

    const adminIds = [pump.ownerAdminId, ...(pump.admins || [])].filter(Boolean);
    await User.updateMany(
      { _id: { $in: adminIds } },
      { $set: { status: 'approved', isActive: true } }
    );

    await createAuditLog({
      petrolPumpId: pump._id,
      action: 'SUPER_ADMIN_PUMP_REACTIVATED',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: 'super_admin',
      targetId: pump._id,
      targetModel: 'PetrolPump',
      details: { pumpName: pump.name },
      requestId: req.id,
    });

    logger.info({ pumpId: pump._id }, 'Petrol pump reactivated');

    return sendSuccess(res, pump, 'Petrol pump reactivated successfully');
  } catch (err) {
    next(err);
  }
};

const getAdmins = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { role: 'admin' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const [admins, total] = await Promise.all([
      User.find(query)
        .populate('petrolPumpId', 'name city status')
        .sort('-createdAt')
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      User.countDocuments(query),
    ]);

    return sendSuccess(res, admins, 'Administrators retrieved', 200, {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    next(err);
  }
};

const getCustomers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { role: 'customer' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const [customers, total] = await Promise.all([
      User.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Find pump accounts linked to these customers
    const customerIds = customers.map((c) => c._id);
    const pumpAccounts = await CustomerPumpAccount.find({
      $or: [
        { customerUserId: { $in: customerIds } },
        { userId: { $in: customerIds } },
      ],
    }).populate('petrolPumpId', 'name city status').lean();

    const accountsByUserId = {};
    pumpAccounts.forEach((acc) => {
      const uId = String(acc.customerUserId || acc.userId);
      if (!accountsByUserId[uId]) accountsByUserId[uId] = [];
      accountsByUserId[uId].push({
        id: acc._id,
        pumpId: acc.petrolPumpId?._id || acc.petrolPumpId,
        pumpName: acc.petrolPumpId?.name || 'Unknown',
        customerCode: acc.customerCode,
        currentBalance: acc.currentBalance,
      });
    });

    const enriched = customers.map((c) => ({
      ...c,
      linkedPumps: accountsByUserId[String(c._id)] || [],
      linkedPumpsCount: (accountsByUserId[String(c._id)] || []).length,
    }));

    return sendSuccess(res, enriched, 'Customers retrieved', 200, {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { action, petrolPumpId, page = 1, limit = 50 } = req.query;
    const query = {};

    if (action) query.action = action;
    if (petrolPumpId) query.petrolPumpId = petrolPumpId;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', 'name email role')
        .populate('petrolPumpId', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return sendSuccess(res, logs, 'Audit logs retrieved', 200, {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getPetrolPumps,
  getPetrolPumpDetail,
  approvePetrolPump,
  rejectPetrolPump,
  suspendPetrolPump,
  reactivatePetrolPump,
  getAdmins,
  getCustomers,
  getAuditLogs,
};
