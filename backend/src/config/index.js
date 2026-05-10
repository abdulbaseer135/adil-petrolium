'use strict';
require('dotenv').config();

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
};

module.exports = {
  env:      process.env.NODE_ENV || 'development',
  port:     parseInt(process.env.PORT || '5001', 10),   // ✅ changed 5000 → 5001
  apiVersion: process.env.API_VERSION || 'v1',

  mongo: {
    uri: required('MONGO_URI'),
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

  adminSecret: process.env.ADMIN_REGISTRATION_SECRET || '',
  logLevel:    process.env.LOG_LEVEL || 'info',
};