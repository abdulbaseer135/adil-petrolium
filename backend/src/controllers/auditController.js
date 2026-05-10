'use strict';
const AuditLog = require('../models/AuditLog');
const { sendSuccess } = require('../utils/apiResponse');

const getLogs = async (req, res, next) => {
  try {
    const { action, actor, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};
    if (action) query.action = action;
    if (actor)  query.actor  = actor;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(endDate);
    }
    const total = await AuditLog.countDocuments(query);
    const logs  = await AuditLog.find(query)
      .populate('actor', 'name email')
      .sort('-createdAt')
      .skip((page - 1) * limit).limit(parseInt(limit)).lean();
    return sendSuccess(res, logs, 'Audit logs retrieved', 200,
      { total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

module.exports = { getLogs };