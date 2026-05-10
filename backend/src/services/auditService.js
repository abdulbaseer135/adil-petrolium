'use strict';
const AuditLog = require('../models/AuditLog');
const logger   = require('../utils/logger');

const createAuditLog = async ({
  action, actor, actorEmail = '', actorRole = '',
  targetId = null, targetModel = null,
  details = {}, requestId = '',
}) => {
  try {
    await AuditLog.create({
      action, actor, actorEmail, actorRole,
      targetId, targetModel, details, requestId,
    });
  } catch (err) {
    // Never crash the main flow due to audit failure
    logger.error({ err, action }, 'Audit log creation failed');
  }
};

module.exports = { createAuditLog };