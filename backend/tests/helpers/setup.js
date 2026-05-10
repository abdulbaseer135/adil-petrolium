/* Test DB setup helper
 * Connects to test MongoDB, clears collections, and exposes helpers for tests.
 * 
 * DEPRECATED: Use ../helpers/db.js instead
 * Maintained for backwards compatibility only
 */
'use strict';

// Re-export from the new db.js module
module.exports = require('./db');
