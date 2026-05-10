'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User     = require('../models/User');
const generateRecoveryKey = require('../utils/generateRecoveryKey');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Check if admin already exists
  const existing = await User.findOne({ email: 'admin@petrodealer.com' });
  if (existing) {
    console.log('⚠️  Admin already exists — skipping');
    process.exit(0);
  }

  // Create admin user
  const admin = await User.create({
    name:     'Super Admin',
    email:    'admin@petrodealer.com',
    password: 'Admin@12345',
    role:     'admin',
    isActive: true,
  });

  const recoveryKey = generateRecoveryKey();
  admin.recoveryKeyHash = await bcrypt.hash(recoveryKey, 12);
  await admin.save({ validateBeforeSave: false });

  console.log('');
  console.log('✅ Admin user created successfully!');
  console.log('─────────────────────────────────');
  console.log('   Email:    admin@petrodealer.com');
  console.log('   Password: Admin@12345');
  console.log('   Role:     admin');
  console.log('─────────────────────────────────');
  console.log('=== SAVE THIS RECOVERY KEY ===');
  console.log(recoveryKey);
  console.log('==============================');
  console.log('⚠️  Change this password after first login!');

  process.exit(0);
};

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});