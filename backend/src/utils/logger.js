'use strict';
const pino   = require('pino');
const config = require('../config');

const logger = pino({
  level: config.logLevel || 'debug',
  redact: {
    paths: [
      'password',
      'confirmPassword',
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.token',
      'refreshToken',
      'accessToken',
    ],
    censor: '[REDACTED]',
  },
  base: { service: 'petro-dealer-api', env: config.env },
});

module.exports = logger;