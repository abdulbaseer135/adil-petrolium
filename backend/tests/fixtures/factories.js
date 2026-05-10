'use strict';
/**
 * Test Fixtures — Factory Helpers
 * 
 * Generates consistent, unique test data for users, customers, and transactions.
 * All factories support overrides for customization.
 */

const User = require('../../src/models/User');
const CustomerProfile = require('../../src/models/CustomerProfile');
const Transaction = require('../../src/models/Transaction');
const RefreshToken = require('../../src/models/RefreshToken');

let counter = 0;

/**
 * Generate unique identifier for test data
 * @returns {number} Monotonically increasing counter
 */
const unique = () => ++counter;

/**
 * Create admin user
 * @param {object} overrides - Properties to override defaults
 * @returns {Promise<User>} Saved admin user
 * 
 * Example:
 *   const admin1 = await createAdmin({ email: 'boss1@example.com' });
 *   const admin2 = await createAdmin({ email: 'boss2@example.com' });
 */
const createAdmin = async (overrides = {}) => {
  const defaults = {
    name: `Test Admin ${unique()}`,
    email: `admin${unique()}@example.com`,
    password: 'Admin@12345678',
    role: 'admin',
    isActive: true,
  };

  const user = await User.create({ ...defaults, ...overrides });
  return user;
};

/**
 * Create customer user with optional profile
 * 
 * @param {object} userOverrides - User document overrides
 * @param {object} profileOverrides - CustomerProfile document overrides
 * @param {object} options - Additional options
 * @param {boolean} options.createProfile - Whether to create profile (default: true)
 * @returns {Promise<{user, profile}>} User and optional CustomerProfile
 * 
 * Example:
 *   const { user, profile } = await createCustomer(
 *     { email: 'cust1@example.com' },
 *     { phone: '03001234567', address: 'Karachi' }
 *   );
 */
const createCustomer = async (
  userOverrides = {},
  profileOverrides = {},
  options = {}
) => {
  const { createProfile = true } = options;
  const num = unique();

  const userDefaults = {
    name: `Customer ${num}`,
    email: `customer${num}@example.com`,
    password: 'Cust@12345678',
    phone: `0300${String(num).padStart(7, '0')}`,
    role: 'customer',
    isActive: true,
  };

  const user = await User.create({ ...userDefaults, ...userOverrides });

  let profile = null;
  if (createProfile) {
    const profileDefaults = {
      userId: user._id,
      customerCode: `CUST${String(num).padStart(6, '0')}`,
      phone: user.phone,
      address: 'Test Address',
      currentBalance: 0,
      creditLimit: 50000,
      isActive: true,
    };

    profile = await CustomerProfile.create({
      ...profileDefaults,
      ...profileOverrides,
    });
  }

  return { user, profile };
};

/**
 * Create customer owned by admin
 * Sets profile.createdBy to admin._id for ownership checks
 * 
 * @param {User} admin - Admin user who owns the customer
 * @param {object} userOverrides - Customer user overrides
 * @param {object} profileOverrides - CustomerProfile overrides
 * @returns {Promise<{user, profile}>} Customer with admin ownership
 */
const createOwnedCustomer = async (
  admin,
  userOverrides = {},
  profileOverrides = {}
) => {
  const { user, profile } = await createCustomer(
    userOverrides,
    {
      createdBy: admin._id,
      ...profileOverrides,
    }
  );

  return { user, profile };
};

/**
 * Create fuel sale transaction
 * 
 * @param {object} opts - Transaction options
 * @param {ObjectId} opts.customerId - Customer profile ID
 * @param {ObjectId} opts.userId - Customer user ID
 * @param {ObjectId} opts.createdBy - Admin user ID who created transaction
 * @param {string} opts.fuelType - 'pmg' | 'hsd' | 'nr' (default: 'pmg')
 * @param {number} opts.fuelQuantity - Liters (default: 10)
 * @param {number} opts.rate - Price per liter (default: 150)
 * @param {number} opts.previousBalance - Balance before transaction (default: 0)
 * @returns {Promise<Transaction>} Saved transaction
 */
const createFuelSale = async (opts = {}) => {
  const {
    customerId,
    userId,
    createdBy,
    fuelType = 'pmg',
    fuelQuantity = 10,
    rate = 150,
    previousBalance = 0,
  } = opts;

  if (!customerId || !userId || !createdBy) {
    throw new Error('createFuelSale requires customerId, userId, createdBy');
  }

  const totalAmount = fuelQuantity * rate;
  const updatedBalance = previousBalance + totalAmount;

  const tx = await Transaction.create({
    customerId,
    userId,
    createdBy,
    transactionType: 'fuel_sale',
    fuelType,
    fuelQuantity,
    rate,
    totalAmount,
    previousBalance,
    updatedBalance,
    paymentReceived: 0,
  });

  return tx;
};

/**
 * Create payment transaction
 * 
 * @param {object} opts - Transaction options
 * @param {ObjectId} opts.customerId - Customer profile ID
 * @param {ObjectId} opts.userId - Customer user ID
 * @param {ObjectId} opts.createdBy - Admin user ID
 * @param {number} opts.paymentReceived - Payment amount (default: 1000)
 * @param {number} opts.previousBalance - Balance before (default: 5000)
 * @returns {Promise<Transaction>} Saved transaction
 */
const createPayment = async (opts = {}) => {
  const {
    customerId,
    userId,
    createdBy,
    paymentReceived = 1000,
    previousBalance = 5000,
  } = opts;

  if (!customerId || !userId || !createdBy) {
    throw new Error('createPayment requires customerId, userId, createdBy');
  }

  const updatedBalance = previousBalance - paymentReceived;

  const tx = await Transaction.create({
    customerId,
    userId,
    createdBy,
    transactionType: 'payment',
    totalAmount: 0,
    paymentReceived,
    previousBalance,
    updatedBalance,
  });

  return tx;
};

/**
 * Create opening balance transaction
 * 
 * @param {object} opts - Transaction options
 * @param {ObjectId} opts.customerId - Customer profile ID
 * @param {ObjectId} opts.userId - Customer user ID
 * @param {ObjectId} opts.createdBy - Admin user ID
 * @param {number} opts.amount - Opening balance amount
 * @returns {Promise<Transaction>} Saved transaction
 */
const createOpeningBalance = async (opts = {}) => {
  const {
    customerId,
    userId,
    createdBy,
    amount = 0,
  } = opts;

  if (!customerId || !userId || !createdBy) {
    throw new Error('createOpeningBalance requires customerId, userId, createdBy');
  }

  const tx = await Transaction.create({
    customerId,
    userId,
    createdBy,
    transactionType: 'opening_balance',
    totalAmount: amount,
    previousBalance: 0,
    updatedBalance: amount,
    paymentReceived: 0,
  });

  return tx;
};

/**
 * Create credit note transaction
 * 
 * @param {object} opts - Transaction options
 * @param {ObjectId} opts.customerId - Customer profile ID
 * @param {ObjectId} opts.userId - Customer user ID
 * @param {ObjectId} opts.createdBy - Admin user ID
 * @param {number} opts.amount - Credit amount
 * @param {string} opts.referenceNo - Reference number
 * @param {number} opts.previousBalance - Balance before
 * @returns {Promise<Transaction>} Saved transaction
 */
const createCreditNote = async (opts = {}) => {
  const {
    customerId,
    userId,
    createdBy,
    amount = 500,
    referenceNo = 'CN-2024-001',
    previousBalance = 10000,
  } = opts;

  if (!customerId || !userId || !createdBy) {
    throw new Error('createCreditNote requires customerId, userId, createdBy');
  }

  const updatedBalance = previousBalance + amount;

  const tx = await Transaction.create({
    customerId,
    userId,
    createdBy,
    transactionType: 'credit_note',
    totalAmount: amount,
    previousBalance,
    updatedBalance,
    paymentReceived: 0,
    referenceNo,
  });

  return tx;
};

/**
 * Create refresh token
 * 
 * @param {object} opts - Options
 * @param {ObjectId} opts.userId - User ID
 * @param {string} opts.tokenHash - Hashed token (if not provided, generates random)
 * @param {string} opts.ipAddress - IP address (default: '127.0.0.1')
 * @param {string} opts.userAgent - User agent string
 * @returns {Promise<RefreshToken>} Saved refresh token
 */
const createRefreshToken = async (opts = {}) => {
  const crypto = require('crypto');
  const {
    userId,
    tokenHash = crypto.createHash('sha256').update(crypto.randomBytes(64)).digest('hex'),
    ipAddress = '127.0.0.1',
    userAgent = 'Test Agent',
  } = opts;

  if (!userId) {
    throw new Error('createRefreshToken requires userId');
  }

  const token = await RefreshToken.create({
    userId,
    tokenHash,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return token;
};

module.exports = {
  createAdmin,
  createCustomer,
  createOwnedCustomer,
  createFuelSale,
  createPayment,
  createOpeningBalance,
  createCreditNote,
  createRefreshToken,
  unique,
};
