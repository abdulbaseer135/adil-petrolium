'use strict';
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const validateBody = (schema) => (req, res, next) => {
  const { value, error } = schema.validate(req.body, {
    abortEarly:  false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors:  error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      })),
    });
  }

  req.body = value;
  next();
};

module.exports = validate;
module.exports.validateBody = validateBody;