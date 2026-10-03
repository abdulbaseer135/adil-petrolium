'use strict';
require('dotenv').config();

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
};

const { extractDatabaseName, isTestDatabaseName } = require('../utils/dbSafety');

const getMongoUri = () => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'test') {
    const testUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/petro_dealer_test';
    const testDbName = extractDatabaseName(testUri);
    if (!isTestDatabaseName(testDbName)) {
      throw new Error(
        `[DATABASE CONFIG ERROR] MONGO_URI_TEST must point to a test database containing 'test' in its name. Got: '${testDbName}'`
      );
    }
    return testUri;
  }

  // Production environment
  if (env === 'production') {
    const prodUri = process.env.MONGO_URI_PRODUCTION || process.env.MONGO_URI;
    if (!prodUri) {
      throw new Error('[DATABASE CONFIG ERROR] MONGO_URI (or MONGO_URI_PRODUCTION) is required in production.');
    }
    const prodDbName = extractDatabaseName(prodUri);
    if (isTestDatabaseName(prodDbName)) {
      throw new Error(
        `[DATABASE CONFIG ERROR] Production cannot connect to a test database ('${prodDbName}').`
      );
    }
    return prodUri;
  }

  // Development environment
  const devUri = process.env.MONGO_URI_DEVELOPMENT || process.env.MONGO_URI;
  if (!devUri) {
    throw new Error('[DATABASE CONFIG ERROR] MONGO_URI is required for development. Refusing to start without explicit database configuration.');
  }
  return devUri;
};

module.exports = {
  env:      process.env.NODE_ENV || 'development',
  port:     parseInt(process.env.PORT || '5001', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  mongo: {
    uri: getMongoUri(),
    testUri: process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/petro_dealer_test',
  },

  jwt: {
    accessSecret:  required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn:  process.env.JWT_ACCESS_EXPIRES_IN  || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  },

  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    adminNumber: process.env.WHATSAPP_ADMIN_NUMBER || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  },

  superAdminEmail: (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim(),
  adminSecret: process.env.ADMIN_REGISTRATION_SECRET || '',
  logLevel:    process.env.LOG_LEVEL || 'info',
};