'use strict';
require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/models/User');
const CustomerProfile = require('../src/models/CustomerProfile');

const argv = require('yargs')
  .option('admin', { type: 'string', default: 'admin@petrodealer.com' })
  .option('email', { type: 'string', default: 'customer1@example.com' })
  .option('name', { type: 'string', default: 'Test Customer 1' })
  .option('customerCode', { type: 'string', default: 'CUST000001' })
  .option('password', { type: 'string', default: 'Cust@12345678' })
  .help(false)
  .argv;

const create = async () => {
  await connectDB();
  const { admin, email, name, customerCode, password } = argv;

  try {
    const adminUser = await User.findOne({ email: admin }).lean();
    if (!adminUser) {
      console.error('Admin user not found:', admin);
      process.exit(1);
    }

    // Create user if not exists
    let user = await User.findOne({ email }).lean();
    if (!user) {
      user = await User.create({ name, email, password, role: 'customer', isActive: true });
      console.log('Created customer user:', email);
    } else {
      console.log('Customer user already exists:', email);
    }

    const existsProfile = await CustomerProfile.findOne({ userId: user._id }).lean();
    if (existsProfile) {
      console.log('Customer profile already exists for user');
      process.exit(0);
    }

    const profile = await CustomerProfile.create({
      userId: user._id,
      customerCode: customerCode.toUpperCase(),
      phone: '',
      address: 'Test Address',
      createdBy: adminUser._id,
      creditLimit: 0,
      isActive: true,
    });

    console.log('Created customer profile:', profile.customerCode);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create customer:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

create();
