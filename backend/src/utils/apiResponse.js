'use strict';

const sendSuccess = (res, data, message = 'Success', statusCode = 200, meta = null) => {
  const payload = { success: true, message, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

const sendError = (res, message = 'Error', statusCode = 400, errors = []) =>
  res.status(statusCode).json({ success: false, message, errors });

module.exports = { sendSuccess, sendError };