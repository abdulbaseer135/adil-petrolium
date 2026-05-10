'use strict';
require('dotenv').config();
const config = require('../src/config');
const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/models/User');

const argv = require('yargs')
  .option('email', { type: 'string', default: 'admin@example.com' })
  .option('password', { type: 'string', default: 'Admin@12345678' })
  .help(false)
  .argv;

const create = async () => {
  await connectDB();

  const { email, password } = argv;
  try {
    const exists = await User.findOne({ email }).lean();
    if (exists) {
      console.log(`User with email ${email} already exists`);
      return process.exit(0);
    }

    const user = await User.create({
      name: 'Local Admin',
      email,
      password,
      role: 'admin',
      isActive: true,
    });

    console.log('Created admin user:', { id: user._id.toString(), email: user.email });
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

create();
