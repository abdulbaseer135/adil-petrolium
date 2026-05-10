'use strict';
require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/database');
// Ensure User model is registered before populating
const User = require('../src/models/User');
const CustomerProfile = require('../src/models/CustomerProfile');

const run = async () => {
  await connectDB();
  try {
    const customers = await CustomerProfile.find({}).populate('userId', 'name email').lean();
    console.log(JSON.stringify(customers, null, 2));
  } catch (err) {
    console.error('Error dumping customers:', err);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

run();
