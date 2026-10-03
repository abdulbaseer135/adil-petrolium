'use strict';
/**
 * Test Fixtures — Factory Helpers
 * 
 * Generates consistent, unique test data for users, pumps, customers, and transactions.
 * All factories support overrides for customization.
 */

const User = require('../../src/models/User');
const PetrolPump = require('../../src/models/PetrolPump');
const CustomerPumpAccount = require('../../src/models/CustomerPumpAccount');
const Transaction = require('../../src/models/Transaction');
const RefreshToken = require('../../src/models/RefreshToken');

let counter = 0;

const syncCustomerBalance = async (customerId, currentBalance) => {
  await CustomerPumpAccount.findByIdAndUpdate(customerId, { currentBalance });
};

const unique = () => ++counter;

/**
 * Create petrol pump directly
 */
const createPetrolPump = async (overrides = {}) => {
  const num = unique();
  const defaults = {
    name: `Petrol Pump ${num}`,
    registrationNumber: `REG-${num}`,
    businessEmail: `pump${num}@example.com`,
    city: 'Lahore',
    province: 'Punjab',
    status: 'approved',
    approvedAt: new Date(),
  };

  // If no ownerAdminId provided, create a dummy ObjectId or admin
  if (!overrides.ownerAdminId) {
    const mongoose = require('mongoose');
    defaults.ownerAdminId = new mongoose.Types.ObjectId();
  }

  const pump = await PetrolPump.create({ ...defaults, ...overrides });
  return pump;
};

/**
 * Create admin user with associated approved PetrolPump
 */
const createAdmin = async (overrides = {}) => {
  const num = unique();
  const defaults = {
    name: `Test Admin ${num}`,
    email: `admin${num}@example.com`,
    password: 'Admin@12345678',
    role: 'admin',
    status: 'approved',
    isActive: true,
  };

  const user = await User.create({ ...defaults, ...overrides });

  // If admin doesn't have a petrol pump specified, create one
  if (!user.petrolPumpId) {
    const pump = await PetrolPump.create({
      name: `${user.name}'s Station`,
      ownerAdminId: user._id,
      admins: [user._id],
      businessEmail: user.email,
      status: overrides.status === 'pending' ? 'pending' : (overrides.status || 'approved'),
      approvedAt: overrides.status === 'pending' ? null : new Date(),
    });

    user.petrolPumpId = pump._id;
    await user.save({ validateBeforeSave: false });
    user.pump = pump;
  }

  return user;
};

/**
 * Create super admin user
 */
const createSuperAdmin = async (overrides = {}) => {
  const num = unique();
  const defaults = {
    name: `Super Admin ${num}`,
    email: `superadmin${num}@example.com`,
    password: 'SuperAdmin@12345678',
    role: 'super_admin',
    status: 'active',
    isActive: true,
  };

  const user = await User.create({ ...defaults, ...overrides });
  return user;
};

/**
 * Create customer user with optional CustomerPumpAccount
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
    status: 'active',
    isActive: true,
  };

  const user = await User.create({ ...userDefaults, ...userOverrides });

  let profile = null;
  if (createProfile) {
    let pumpId = profileOverrides.petrolPumpId;
    if (!pumpId) {
      const existingPump = await PetrolPump.findOne();
      if (existingPump) {
        pumpId = existingPump._id;
      } else {
        const defaultPump = await createPetrolPump();
        pumpId = defaultPump._id;
      }
    }

    const profileDefaults = {
      petrolPumpId: pumpId,
      customerUserId: user._id,
      userId: user._id,
      customerName: user.name,
      customerCode: `CUST${String(num).padStart(6, '0')}`,
      phone: user.phone,
      address: 'Test Address',
      currentBalance: 0,
      creditLimit: 50000,
      isActive: true,
      status: 'active',
    };

    profile = await CustomerPumpAccount.create({
      ...profileDefaults,
      ...profileOverrides,
      petrolPumpId: pumpId,
    });
  }

  return { user, profile };
};

/**
 * Create customer owned by admin's petrol pump
 */
const createOwnedCustomer = async (
  admin,
  userOverrides = {},
  profileOverrides = {}
) => {
  let pumpId = admin.petrolPumpId || admin.pump?._id;
  if (!pumpId) {
    const pump = await PetrolPump.findOne({ admins: admin._id });
    pumpId = pump?._id;
  }

  const { user, profile } = await createCustomer(
    userOverrides,
    {
      petrolPumpId: pumpId,
      createdBy: admin._id,
      ...profileOverrides,
    }
  );

  return { user, profile };
};

/**
 * Create fuel sale transaction
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

  const profile = await CustomerPumpAccount.findById(customerId);
  const pumpId = opts.petrolPumpId || profile?.petrolPumpId;

  const totalAmount = fuelQuantity * rate;
  const updatedBalance = previousBalance + totalAmount;

  const tx = await Transaction.create({
    petrolPumpId: pumpId,
    customerId,
    customerAccountId: customerId,
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

  await syncCustomerBalance(customerId, updatedBalance);
  return tx;
};

/**
 * Create payment transaction
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

  const profile = await CustomerPumpAccount.findById(customerId);
  const pumpId = opts.petrolPumpId || profile?.petrolPumpId;

  const updatedBalance = previousBalance - paymentReceived;

  const tx = await Transaction.create({
    petrolPumpId: pumpId,
    customerId,
    customerAccountId: customerId,
    userId,
    createdBy,
    transactionType: 'payment',
    totalAmount: 0,
    paymentReceived,
    previousBalance,
    updatedBalance,
  });

  await syncCustomerBalance(customerId, updatedBalance);
  return tx;
};

/**
 * Create opening balance transaction
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

  const profile = await CustomerPumpAccount.findById(customerId);
  const pumpId = opts.petrolPumpId || profile?.petrolPumpId;

  const tx = await Transaction.create({
    petrolPumpId: pumpId,
    customerId,
    customerAccountId: customerId,
    userId,
    createdBy,
    transactionType: 'opening_balance',
    totalAmount: amount,
    previousBalance: 0,
    updatedBalance: amount,
    paymentReceived: 0,
  });

  await syncCustomerBalance(customerId, amount);
  return tx;
};

/**
 * Create credit note transaction
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

  const profile = await CustomerPumpAccount.findById(customerId);
  const pumpId = opts.petrolPumpId || profile?.petrolPumpId;

  const signed = -Math.abs(amount);
  const updatedBalance = previousBalance + signed;

  const tx = await Transaction.create({
    petrolPumpId: pumpId,
    customerId,
    customerAccountId: customerId,
    userId,
    createdBy,
    transactionType: 'credit_note',
    totalAmount: signed,
    previousBalance,
    updatedBalance,
    paymentReceived: 0,
    referenceNo,
  });

  await syncCustomerBalance(customerId, updatedBalance);
  return tx;
};

/**
 * Create refresh token
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
  createPetrolPump,
  createAdmin,
  createSuperAdmin,
  createCustomer,
  createOwnedCustomer,
  createFuelSale,
  createPayment,
  createOpeningBalance,
  createCreditNote,
  createRefreshToken,
  unique,
};
