'use strict';
/**
 * Test Database Helper
 * 
 * Manages test database connections, cleanup, and isolation.
 * Provides before/after/beforeEach/afterEach helpers for proper test lifecycle.
 */

const mongoose = require('mongoose');
const config   = require('../../src/config');
const logger   = require('../../src/utils/logger');

/**
 * Connect to test MongoDB
 * Uses MONGO_URI_TEST if provided, falls back to MONGO_URI
 * @throws {Error} if connection fails
 */
const connectTestDB = async () => {
  const uri = process.env.MONGO_URI_TEST || process.env.MONGO_URI || config.mongo.uri;
  if (!uri) {
    throw new Error('No MongoDB URI provided for tests. Set MONGO_URI_TEST or MONGO_URI');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info(
      { uri: uri.replace(/:\/\/.*@/, '://***@') },
      'Connected to test MongoDB'
    );
  } catch (err) {
    logger.error({ err }, 'Test MongoDB connection failed');
    throw err;
  }
};

/**
 * Clear all collections in test database
 * Skips system collections (e.g., system.indexes)
 */
const clearDB = async () => {
  const { collections } = mongoose.connection;
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
    await mongoose.connection.close();
    logger.info('Test MongoDB connection closed');
  } catch (err) {
    logger.error({ err }, 'Error closing test MongoDB connection');
    throw err;
  }
};

/**
 * Disconnect and close all connections
 * More aggressive cleanup than closeDB()
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('Mongoose disconnected');
  } catch (err) {
    logger.error({ err }, 'Error during mongoose disconnect');
    throw err;
  }
};

module.exports = {
  connectTestDB,
  clearDB,
  closeDB,
  disconnectDB,
};
