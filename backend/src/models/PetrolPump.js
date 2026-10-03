'use strict';
const mongoose = require('mongoose');

const petrolPumpSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Petrol pump name is required'],
    trim: true,
    maxlength: [120, 'Pump name too long'],
  },
  ownerAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner admin is required'],
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  registrationNumber: {
    type: String,
    trim: true,
    default: '',
  },
  businessEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  businessPhone: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  city: {
    type: String,
    trim: true,
    default: '',
  },
  province: {
    type: String,
    trim: true,
    default: '',
  },
  country: {
    type: String,
    trim: true,
    default: 'Pakistan',
  },
  logo: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended', 'active'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectedAt: {
    type: Date,
  },
  rejectionReason: {
    type: String,
    default: '',
  },
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  suspendedAt: {
    type: Date,
  },
  suspensionReason: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
  strict: true,
});

petrolPumpSchema.index({ status: 1 });
petrolPumpSchema.index({ ownerAdminId: 1 });
petrolPumpSchema.index({ admins: 1 });
petrolPumpSchema.index({ name: 'text', city: 'text' });

module.exports = mongoose.model('PetrolPump', petrolPumpSchema);
