'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const logger = require('../utils/logger');

const seedSuperAdmin = async () => {
  const uri = process.env.MONGO_URI || config.mongo.uri;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@petrolsystem.local').toLowerCase().trim();
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@12345678';
  const name = process.env.SUPER_ADMIN_NAME || 'Platform Super Admin';
  const phone = process.env.SUPER_ADMIN_PHONE || '03000000000';

  let superAdmin = await User.findOne({ email });

  if (superAdmin) {
    if (superAdmin.role !== 'super_admin' || superAdmin.status !== 'active') {
      superAdmin.role = 'super_admin';
      superAdmin.status = 'active';
      superAdmin.isActive = true;
      await superAdmin.save({ validateBeforeSave: false });
      logger.info({ email }, 'Updated existing user to super_admin');
    } else {
      logger.info({ email }, 'Super Admin already exists and is active');
    }
  } else {
    superAdmin = await User.create({
      name,
      email,
      password,
      phone,
      role: 'super_admin',
      status: 'active',
      isActive: true,
    });
    logger.info({ email: superAdmin.email, role: superAdmin.role }, 'Super Admin seeded successfully');
  }

  return superAdmin;
};

if (require.main === module) {
  seedSuperAdmin()
    .then(async () => {
      await mongoose.disconnect();
      console.log('Super Admin seed completed successfully.');
      process.exit(0);
    })
    .catch(async (err) => {
      await mongoose.disconnect();
      console.error('Super Admin seed failed:', err.message);
      process.exit(1);
    });
}

module.exports = seedSuperAdmin;
