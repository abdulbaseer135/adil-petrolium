'use strict';
const mongoose = require('mongoose');
const config   = require('./index');
const logger   = require('../utils/logger');

const { getSafeDbDiagnostics, extractDatabaseName, isTestDatabaseName } = require('../utils/dbSafety');

const connectDB = async () => {
  try {
    const dbName = extractDatabaseName(config.mongo.uri);
    if (config.env === 'production' && isTestDatabaseName(dbName)) {
      throw new Error(`[CRITICAL] Refusing to start production with test database '${dbName}'`);
    }

    await mongoose.connect(config.mongo.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Connection pooling for better performance
      maxPoolSize: 10,
      minPoolSize: 2,
      // Faster connection establishment
      connectTimeoutMS: 10000,
    });

    const diag = getSafeDbDiagnostics(mongoose.connection);
    logger.info(
      {
        environment: diag.environment,
        database: diag.databaseName,
        host: diag.host,
        port: diag.port,
        state: diag.connectionState,
      },
      `Database connected | Environment: ${diag.environment} | Database: ${diag.databaseName}`
    );

    mongoose.connection.on('error', (err) =>
      logger.error({ err: err.message }, 'MongoDB connection error'));

    mongoose.connection.on('disconnected', () =>
      logger.warn('MongoDB disconnected'));
  } catch (err) {
    logger.fatal({ message: err.message }, 'MongoDB connection failed');
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected cleanly');
};

module.exports = { connectDB, disconnectDB };