'use strict';
const User = require('../models/User');
const CustomerPumpAccount = require('../models/CustomerPumpAccount');
const { createAuditLog } = require('./auditService');
const AppError = require('../utils/AppError');
const cache = require('../utils/cache');

const createCustomer = async ({
  petrolPumpId,
  name,
  email,
  password,
  customerCode,
  phone,
  address,
  vehicleInfo,
  creditLimit,
  openingBalance,
  notes,
  createdBy,
  requestId,
}) => {
  if (!petrolPumpId) throw new AppError('Petrol pump ID is required', 400);
  if (!customerCode) throw new AppError('Customer code is required', 400);

  const formattedCode = customerCode.trim().toUpperCase();

  // Check unique customerCode within this petrol pump
  const duplicate = await CustomerPumpAccount.findOne({
    petrolPumpId,
    customerCode: formattedCode,
  });
  if (duplicate) {
    throw new AppError(`Customer code "${formattedCode}" already exists at this petrol pump`, 409);
  }

  const profile = await CustomerPumpAccount.create({
    petrolPumpId,
    customerUserId: null,
    userId: null,
    customerName: name.trim(),
    customerCode: formattedCode,
    phone: phone ? phone.trim() : '',
    email: email ? email.trim().toLowerCase() : '',
    address: address ? address.trim() : '',
    vehicleInfo: vehicleInfo ? vehicleInfo.trim() : '',
    creditLimit: creditLimit ? Number(creditLimit) : 0,
    currentBalance: openingBalance ? Number(openingBalance) : 0,
    status: 'unclaimed',
    isActive: true,
    notes: notes || '',
    createdBy,
  });

  // If opening balance was provided and > 0, create an opening balance transaction
  if (openingBalance && Number(openingBalance) > 0) {
    const Transaction = require('../models/Transaction');
    await Transaction.create({
      petrolPumpId,
      customerId: profile._id,
      customerAccountId: profile._id,
      userId: profile.customerUserId || null,
      transactionType: 'opening_balance',
      totalAmount: Number(openingBalance),
      previousBalance: 0,
      updatedBalance: Number(openingBalance),
      paymentReceived: 0,
      notes: 'Opening balance recorded at account creation',
      createdBy,
    });
  }

  await createAuditLog({
    petrolPumpId,
    action: 'CUSTOMER_CREATED',
    actor: createdBy,
    targetId: profile._id,
    targetModel: 'CustomerPumpAccount',
    targetType: 'CustomerPumpAccount',
    details: {
      customerCode: profile.customerCode,
      customerName: profile.customerName,
      creditLimit: profile.creditLimit,
    },
    requestId,
  });

  cache.clear();

  // Populate user if present
  if (profile.customerUserId) {
    await profile.populate('customerUserId', 'name email phone');
  }

  return {
    user: profile.customerUserId || null,
    profile,
  };
};

const getCustomers = async ({
  petrolPumpId,
  page = 1,
  limit = 20,
  search,
  isActive,
  sort = '-createdAt',
  requestingUser = null,
}) => {
  const cacheKey = `customers:${petrolPumpId || 'all'}:${page}:${limit}:${search || ''}:${isActive}:${sort}`;

  return cache.wrap(cacheKey, async () => {
    const query = {};

    if (petrolPumpId) {
      query.petrolPumpId = petrolPumpId;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerCode: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const [customers, total] = await Promise.all([
      CustomerPumpAccount.find(query)
        .populate('customerUserId', 'name email phone')
        .populate('userId', 'name email phone')
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      CustomerPumpAccount.countDocuments(query),
    ]);

    // Ensure customerName is populated from linked user if empty
    const normalized = customers.map((c) => ({
      ...c,
      name: c.customerName || c.customerUserId?.name || c.userId?.name || c.customerCode,
      email: c.customerUserId?.email || c.userId?.email || '',
    }));

    return {
      customers: normalized,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }, 30000);
};

const updateCustomer = async ({
  petrolPumpId,
  profileId,
  updates,
  updatedBy,
  requestId,
}) => {
  const allowedFields = [
    'customerName',
    'phone',
    'address',
    'vehicleInfo',
    'creditLimit',
    'notes',
    'isActive',
    'status',
  ];

  const sanitized = {};
  allowedFields.forEach((f) => {
    if (updates[f] !== undefined) sanitized[f] = updates[f];
  });
  if (updates.name && !sanitized.customerName) {
    sanitized.customerName = updates.name.trim();
  }

  const query = { _id: profileId };
  if (petrolPumpId) {
    query.petrolPumpId = petrolPumpId;
  }

  // Block deactivation when customer has an outstanding balance
  if (sanitized.isActive === false || sanitized.status === 'inactive') {
    const current = await CustomerPumpAccount.findOne(query).select('currentBalance').lean();
    if (current && Number(current.currentBalance) > 0) {
      throw new AppError(
        `Cannot deactivate customer with an outstanding balance of PKR ${Number(current.currentBalance).toLocaleString('en-PK', { minimumFractionDigits: 2 })}. Clear the balance first.`,
        400
      );
    }
  }

  const profile = await CustomerPumpAccount.findOneAndUpdate(
    query,
    sanitized,
    { new: true, runValidators: true }
  )
    .populate('customerUserId', 'name email phone')
    .populate('userId', 'name email phone');

  if (!profile) throw new AppError('Customer not found or access denied', 404);

  await createAuditLog({
    petrolPumpId: profile.petrolPumpId,
    action: 'CUSTOMER_UPDATED',
    actor: updatedBy,
    targetId: profileId,
    targetModel: 'CustomerPumpAccount',
    targetType: 'CustomerPumpAccount',
    details: sanitized,
    requestId,
  });

  cache.clear();

  return profile;
};

module.exports = { createCustomer, getCustomers, updateCustomer };