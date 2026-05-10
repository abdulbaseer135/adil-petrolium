'use strict';
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  tokenHash: {
    type:     String,
    required: true,
  },
  ipAddress: { type: String },
  userAgent: { type: String },
  isRevoked: { type: Boolean, default: false },
  expiresAt: { type: Date,    required: true },
}, {
  timestamps: true,
});

// TTL index — MongoDB auto-deletes expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ tokenHash: 1 });
refreshTokenSchema.index({ userId: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);