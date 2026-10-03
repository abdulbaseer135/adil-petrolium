'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const { getSafeDbDiagnostics } = require('../utils/dbSafety');

const runDiagnostics = async () => {
  const uri = process.env.MONGO_URI || config.mongo.uri;

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const diag = getSafeDbDiagnostics(mongoose.connection);

    console.log('\n======================================================');
    console.log('       PETROL MANAGEMENT SYSTEM - DB DIAGNOSTICS       ');
    console.log('======================================================');
    console.log(`Environment:      ${diag.environment}`);
    console.log(`Database Name:    ${diag.databaseName}`);
    console.log(`Connection State: ${diag.connectionState}`);
    console.log(`Host:             ${diag.host}`);
    console.log(`Port:             ${diag.port}`);
    console.log(`Is Test Database: ${diag.isTestDatabase ? 'YES (TEST ONLY)' : 'NO (BUSINESS/DEV/PROD)'}`);
    console.log('------------------------------------------------------');
    console.log('COLLECTION DOCUMENT COUNTS:');

    const collections = await mongoose.connection.db.listCollections().toArray();
    const counts = {};

    for (const coll of collections) {
      const count = await mongoose.connection.collection(coll.name).countDocuments();
      counts[coll.name] = count;
      console.log(`  - ${coll.name.padEnd(25)}: ${count}`);
    }

    // Role breakdown check for Users collection without exposing credentials
    if (counts['users'] > 0) {
      console.log('------------------------------------------------------');
      console.log('USER ROLES SUMMARY:');
      const roleBreakdown = await mongoose.connection.collection('users').aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]).toArray();
      for (const r of roleBreakdown) {
        console.log(`  - Role '${r._id || 'unknown'}': ${r.count}`);
      }
    }

    // Integrity summary: count orphan records
    if (counts['transactions'] > 0) {
      const orphanTx = await mongoose.connection.collection('transactions').countDocuments({
        $or: [{ petrolPumpId: { $exists: false } }, { petrolPumpId: null }]
      });
      console.log('------------------------------------------------------');
      console.log(`Orphan Transactions (missing petrolPumpId): ${orphanTx}`);
    }

    if (counts['customerpumpaccounts'] > 0) {
      const orphanCust = await mongoose.connection.collection('customerpumpaccounts').countDocuments({
        $or: [{ petrolPumpId: { $exists: false } }, { petrolPumpId: null }]
      });
      console.log(`Orphan Customer Accounts (missing petrolPumpId): ${orphanCust}`);
    }

    console.log('======================================================\n');
    await mongoose.disconnect();
    return { diagnostics: diag, counts };
  } catch (err) {
    console.error('Database diagnostics failed:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

if (require.main === module) {
  runDiagnostics().then(() => process.exit(0));
}

module.exports = runDiagnostics;
