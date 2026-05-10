'use strict';
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action:      { type: String, required: true },
  actor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorEmail:  { type: String, default: '' },
  actorRole:   { type: String, default: '' },
  targetId:    { type: mongoose.Schema.Types.ObjectId, default: null },
  targetModel: { type: String, default: null },
  details:     { type: mongoose.Schema.Types.Mixed, default: {} },
  requestId:   { type: String, default: '' },
}, {
  timestamps: true,
});

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
// Auto-delete audit logs after 2 years
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);