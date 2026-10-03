'use strict';
/**
 * Test Environment Initializer
 * Automatically loaded via Mocha -r flag before any test suite executes.
 * Guarantees strict test isolation from development/production databases.
 */

process.env.NODE_ENV = 'test';

const { extractDatabaseName, isTestDatabaseName, assertTestDatabase } = require('../../src/utils/dbSafety');

// Set safe test database URI
const testUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/petro_dealer_test';
process.env.MONGO_URI_TEST = testUri;

// Also overwrite process.env.MONGO_URI during test runs so any code reading MONGO_URI
// gets the isolated test database rather than the dev database.
process.env.MONGO_URI = testUri;

const dbName = extractDatabaseName(testUri);

if (!isTestDatabaseName(dbName)) {
  console.error('\n[FATAL TEST ENVIRONMENT MISCONFIGURATION]');
  console.error(`Tests attempted to configure database: '${dbName}'`);
  console.error('Test database name MUST include "test" and cannot match production/development database.');
  process.exit(1);
}

// Ensure safety assertions pass
assertTestDatabase(testUri);
