'use strict';
const mongoose = require('mongoose');

const migrationHistorySchema = new mongoose.Schema({
  migrationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  version: {
    type: String,
    default: '1.0.0',
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'dry_run'],
    required: true,
    default: 'pending',
  },
  recordsInspected: {
    type: Number,
    default: 0,
  },
  recordsUpdated: {
    type: Number,
    default: 0,
  },
  recordsCreated: {
    type: Number,
    default: 0,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  error: {
    type: String,
    default: null,
  },
  isDryRun: {
    type: Boolean,
    default: false,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  executedBy: {
    type: String,
    default: 'system',
  },
}, {
  timestamps: true,
  strict: true,
});

module.exports = mongoose.models.MigrationHistory ||
  mongoose.model('MigrationHistory', migrationHistorySchema);
