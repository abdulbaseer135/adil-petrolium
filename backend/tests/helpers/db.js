'use strict';
/**
 * Test Database Helper
 * 
 * Manages test database connections, cleanup, and isolation.
 * Provides before/after/beforeEach/afterEach helpers for proper test lifecycle.
 * STRICTLY GUARDS against touching development or production databases.
 */

// Force test environment
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const config   = require('../../src/config');
const logger   = require('../../src/utils/logger');
const {
  extractDatabaseName,
  isTestDatabaseName,
  assertTestDatabase,
  assertDestructiveOperationAllowed,
  getSafeDbDiagnostics,
} = require('../../src/utils/dbSafety');

/**
 * Connect to test MongoDB
 * Strictly uses MONGO_URI_TEST or default isolated test URI.
 * Refuses connection if pointing to development or production database.
 * @throws {Error} if connection fails or safety assertion fails
 */
const connectTestDB = async () => {
  // Ensure NODE_ENV is test
  process.env.NODE_ENV = 'test';

  const uri = process.env.MONGO_URI_TEST || config.mongo?.testUri || 'mongodb://localhost:27017/petro_dealer_test';

  const dbName = extractDatabaseName(uri);
  if (!isTestDatabaseName(dbName)) {
    throw new Error(
      `[CRITICAL TEST DB GUARD] Refusing to connect test suite to non-test database '${dbName}'. Test database must contain 'test' in its name.`
    );
  }

  // Pre-connection safety assertion
  assertTestDatabase(uri);

  try {
    if (mongoose.connection.readyState !== 0) {
      // If already connected, verify it's the test database
      assertTestDatabase(mongoose.connection);
      return;
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Post-connection safety assertion
    assertTestDatabase(mongoose.connection);

    const diag = getSafeDbDiagnostics(mongoose.connection);
    logger.info(
      {
        environment: diag.environment,
        database: diag.databaseName,
        isTestDatabase: diag.isTestDatabase,
      },
      `Connected to test MongoDB: ${diag.databaseName}`
    );
  } catch (err) {
    logger.error({ err: err.message }, 'Test MongoDB connection failed');
    throw err;
  }
};

/**
 * Clear all collections in test database
 * STRICTLY ASSERT THAT THE CONNECTED DATABASE IS AN ISOLATED TEST DATABASE.
 * Skips system collections (e.g., system.indexes)
 */
const clearDB = async () => {
  // Triple-layer safety check before ANY deletion can occur
  assertDestructiveOperationAllowed(mongoose.connection, 'clearDB');
  assertTestDatabase(mongoose.connection);

  const { collections } = mongoose.connection;
  if (!collections) return;

  const keys = Object.keys(collections);

  for (const key of keys) {
    // Skip system collections
    if (key.startsWith('system.')) continue;

    try {
      const collection = collections[key];
      await collection.deleteMany({});
    } catch (err) {
      // Log but don't fail on individual collection clear
      logger.debug({ collection: key, err: err.message }, 'Warning clearing collection');
    }
  }
};

/**
 * Close MongoDB connection cleanly
 */
const closeDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info('Test MongoDB connection closed');
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Error closing test MongoDB connection');
    throw err;
  }
};

/**
 * Disconnect and close all connections
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('Mongoose disconnected');
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Error during mongoose disconnect');
    throw err;
  }
};

module.exports = {
  connectTestDB,
  clearDB,
  closeDB,
  disconnectDB,
};
