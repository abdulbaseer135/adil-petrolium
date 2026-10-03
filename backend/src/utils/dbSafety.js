'use strict';
/**
 * Database Safety Utility
 * 
 * Protects financial and business data from accidental deletion,
 * wrong-database connections, and unauthorized destructive operations.
 */

const mongoose = require('mongoose');

/**
 * Extract clean database name from MongoDB URI
 * Handles standard mongodb:// and SRV mongodb+srv:// connection strings
 * @param {string} uri
 * @returns {string} database name or 'unknown'
 */
const extractDatabaseName = (uri) => {
  if (!uri || typeof uri !== 'string') return 'unknown';

  try {
    // Strip query parameters
    const withoutQuery = uri.split('?')[0];
    // Split by protocol separator
    const afterProtocol = withoutQuery.split('://')[1];
    if (!afterProtocol) return 'unknown';

    // Split by slash to get the path part
    const slashIdx = afterProtocol.indexOf('/');
    if (slashIdx === -1) return 'unknown';

    const dbPart = afterProtocol.slice(slashIdx + 1).trim();
    return dbPart || 'unknown';
  } catch {
    return 'unknown';
  }
};

/**
 * Check if a database name explicitly identifies as test-only
 * @param {string} dbName
 * @returns {boolean}
 */
const isTestDatabaseName = (dbName) => {
  if (!dbName || typeof dbName !== 'string') return false;
  const lower = dbName.toLowerCase().trim();
  // Must include 'test'
  if (!lower.includes('test')) return false;

  // Explicit safety blacklist: names that are dangerous or ambiguously production-like
  const prohibitedExact = ['production', 'prod', 'live', 'petro_dealer', 'petrodealer', 'petrol_management'];
  if (prohibitedExact.includes(lower)) return false;

  return true;
};

/**
 * Assert that the connection is strictly pointing to an isolated test database
 * Refuses execution if running in non-test environment or against a non-test database name
 * @param {mongoose.Connection|string} connOrUri
 * @throws {Error} if not a test database
 */
const assertTestDatabase = (connOrUri) => {
  const env = process.env.NODE_ENV;
  if (env !== 'test') {
    throw new Error(
      `[DATABASE SAFETY CRITICAL] Destructive test operation rejected: NODE_ENV must be 'test', currently '${env}'.`
    );
  }

  let dbName = '';
  if (typeof connOrUri === 'string') {
    dbName = extractDatabaseName(connOrUri);
  } else if (connOrUri && connOrUri.name) {
    dbName = connOrUri.name;
  } else if (mongoose.connection && mongoose.connection.name) {
    dbName = mongoose.connection.name;
  }

  if (!dbName || dbName === 'unknown') {
    throw new Error(
      '[DATABASE SAFETY CRITICAL] Cannot verify database name. Destructive operation aborted.'
    );
  }

  if (!isTestDatabaseName(dbName)) {
    throw new Error(
      `[DATABASE SAFETY CRITICAL] Refusing destructive operation against non-test database '${dbName}'. Database name must explicitly include 'test'.`
    );
  }

  return true;
};

/**
 * Assert destructive operations are authorized
 * In production or normal development, destructive commands (deleteMany, drop, reset) are STRICTLY FORBIDDEN.
 * @param {mongoose.Connection} [connection]
 * @param {string} [operationName]
 */
const assertDestructiveOperationAllowed = (connection, operationName = 'destructive_operation') => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    throw new Error(
      `[DATABASE SAFETY CRITICAL] Refusing '${operationName}' in PRODUCTION. Destructive database operations are permanently disabled in production.`
    );
  }

  // If in test environment, enforce strict test DB validation
  if (env === 'test') {
    assertTestDatabase(connection || mongoose.connection);
    return true;
  }

  // In development, require explicit one-time opt-in flag AND never allow normal app runtime to call it
  const allowDevOps = process.env.ALLOW_DESTRUCTIVE_DEV_OPS === 'true';
  if (!allowDevOps) {
    throw new Error(
      `[DATABASE SAFETY CRITICAL] Refusing '${operationName}' in ${env} environment. To override for explicit maintenance, set ALLOW_DESTRUCTIVE_DEV_OPS=true.`
    );
  }

  return true;
};

/**
 * Returns safe database diagnostics without exposing credentials
 * @param {mongoose.Connection} [connection]
 * @returns {object} safe diagnostic details
 */
const getSafeDbDiagnostics = (connection) => {
  const conn = connection || mongoose.connection;
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized',
  };

  const state = stateMap[conn?.readyState] || 'unknown';
  const dbName = conn?.name || 'unknown';
  const host = conn?.host || 'unknown';
  const port = conn?.port || 'unknown';
  const env = process.env.NODE_ENV || 'development';

  return {
    environment: env,
    databaseName: dbName,
    connectionState: state,
    host,
    port,
    isTestDatabase: isTestDatabaseName(dbName),
  };
};

module.exports = {
  extractDatabaseName,
  isTestDatabaseName,
  assertTestDatabase,
  assertDestructiveOperationAllowed,
  getSafeDbDiagnostics,
};
