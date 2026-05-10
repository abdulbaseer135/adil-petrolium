"use strict";
const router = require('express').Router();
const { addClient } = require('../utils/sse');
const { authenticate, enforceCustomerOwnership } = require('../middleware/auth');
const { query, param } = require('express-validator');
const validate = require('../middleware/validate');

// Server-Sent Events endpoint for transaction updates
// Requires authentication. Customers may only subscribe to their own stream.
router.get('/transactions', authenticate, enforceCustomerOwnership,
  [ query('customerId').optional().isMongoId().withMessage('Invalid customerId') ],
  validate,
  async (req, res, next) => {
  try {
    // If the caller is a customer, enforce ownership and derive customerId
    let customerId = req.query.customerId || req.customerId;
    if (req.user && req.user.role === 'customer') {
      // enforceCustomerOwnership middleware sets req.customerId for verified customer profile
      customerId = req.customerId;
      
      // Prevent customer from accessing other customers' streams
      if (req.query.customerId && req.query.customerId !== req.customerId) {
        return res.status(403).json({ success: false, message: 'Not authorized to access this customer\'s stream' });
      }
    }

    if (!customerId) return res.status(400).json({ success: false, message: 'customerId is required' });

    // Basic validation: ensure customerId looks like a Mongo ID
    if (!/^[0-9a-fA-F]{24}$/.test(String(customerId))) {
      return res.status(422).json({ success: false, message: 'Invalid customerId' });
    }

    // Set SSE headers
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders && res.flushHeaders();

    // Send a comment ping to establish connection
    res.write(': connected\n\n');

    addClient(String(customerId), res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
