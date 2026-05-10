'use strict';
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

module.exports = function requestLogger(req, res, next) {
  const reqId = req.headers['x-request-id'] || uuidv4();
  const start = Date.now();

  req.id = reqId;
  res.setHeader('X-Request-ID', reqId);

  res.on('finish', () => {
    const ms    = Date.now() - start;
    const level =
      res.statusCode >= 500 ? 'error' :
      res.statusCode >= 400 ? 'warn'  : 'info';

    logger[level]({
      reqId,
      method:     req.method,
      url:        req.url,
      statusCode: res.statusCode,
      ms,
      ip: req.ip || req.socket?.remoteAddress || 'unknown',
    }, `${req.method} ${req.url} ${res.statusCode} ${ms}ms`);
  });

  next();
};