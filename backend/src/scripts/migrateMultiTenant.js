'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const PetrolPump = require('../models/PetrolPump');
const CustomerPumpAccount = require('../models/CustomerPumpAccount');
const Transaction = require('../models/Transaction');
const DailyRecord = require('../models/DailyRecord');
const MigrationHistory = require('../models/MigrationHistory');
const logger = require('../utils/logger');
const { getSafeDbDiagnostics } = require('../utils/dbSafety');

const MIGRATION_ID = '2026-05-18_multi_tenant_v1';
const MIGRATION_NAME = 'Multi-tenant PetrolPump & CustomerPumpAccount Migration';
const MIGRATION_VERSION = '1.1.0';

/**
 * Run Multi-Tenant Migration safely
 * Supports --dry-run flag for previewing changes without touching data
 * Safe to rerun repeatedly (idempotent)
 */
const runMigration = async (options = {}) => {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');
  const isForce = options.force || process.argv.includes('--force');

  const uri = process.env.MONGO_URI || config.mongo.uri;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  }

  const diag = getSafeDbDiagnostics(mongoose.connection);
  logger.info(
    { database: diag.databaseName, environment: diag.environment, isDryRun },
    `Starting multi-tenant migration on database: ${diag.databaseName} [Dry Run: ${isDryRun}]`
  );

  // Check if migration has already completed
  if (!isDryRun && !isForce) {
    const existingMigration = await MigrationHistory.findOne({
      migrationId: MIGRATION_ID,
      status: 'completed',
    });

    if (existingMigration) {
      logger.info(
        {
          migrationId: MIGRATION_ID,
          completedAt: existingMigration.completedAt,
          recordsUpdated: existingMigration.recordsUpdated,
        },
        'Migration already successfully completed. Exiting safely (idempotent).'
      );
      if (options.disconnect) await mongoose.disconnect();
      return { skipped: true, reason: 'already_completed' };
    }
  }

  const report = {
    isDryRun,
    adminsFound: 0,
    pumpsToCreate: 0,
    adminsToUpdate: 0,
    customerAccountsToUpdate: 0,
    transactionsToUpdate: 0,
    dailyRecordsToUpdate: 0,
    orphanTransactions: 0,
    unmappedRecords: 0,
    conflicts: [],
  };

  const startTime = new Date();
  let migrationRecord = null;

  if (!isDryRun) {
    migrationRecord = await MigrationHistory.findOneAndUpdate(
      { migrationId: MIGRATION_ID },
      {
        migrationId: MIGRATION_ID,
        name: MIGRATION_NAME,
        version: MIGRATION_VERSION,
        status: 'running',
        isDryRun: false,
        startedAt: startTime,
      },
      { upsert: true, new: true }
    );
  }

  try {
    const admins = await User.find({ role: 'admin' });
    report.adminsFound = admins.length;
    logger.info({ count: admins.length }, `Evaluating ${admins.length} admin accounts`);

    let defaultPump = null;

    for (const admin of admins) {
      let pump = null;
      if (admin.petrolPumpId) {
        pump = await PetrolPump.findById(admin.petrolPumpId);
      }
      if (!pump) {
        pump = await PetrolPump.findOne({ admins: admin._id });
      }

      if (!pump) {
        report.pumpsToCreate += 1;
        const pumpName = admin.name ? `${admin.name}'s Petrol Station` : 'Petrol Management System';
        if (!isDryRun) {
          pump = await PetrolPump.create({
            name: pumpName,
            ownerAdminId: admin._id,
            admins: [admin._id],
            businessEmail: admin.email,
            businessPhone: admin.phone || '',
            status: 'approved',
            approvedAt: new Date(),
          });
          logger.info({ adminId: admin._id, pumpId: pump._id, name: pump.name }, 'Created PetrolPump for admin');
        } else {
          logger.info({ adminId: admin._id, plannedName: pumpName }, '[DRY RUN] Would create PetrolPump');
        }
      }

      if (pump && (!admin.petrolPumpId || String(admin.petrolPumpId) !== String(pump._id) || admin.status !== 'approved')) {
        report.adminsToUpdate += 1;
        if (!isDryRun) {
          admin.petrolPumpId = pump._id;
          admin.status = 'approved';
          await admin.save({ validateBeforeSave: false });
          logger.info({ adminId: admin._id, pumpId: pump._id }, 'Associated admin with PetrolPump');
        }
      }

      if (pump && !defaultPump) defaultPump = pump;

      // Migrate CustomerPumpAccounts for this admin / pump
      const customerAccounts = await CustomerPumpAccount.find({
        $or: [
          { petrolPumpId: { $exists: false } },
          { petrolPumpId: null },
          { createdBy: admin._id },
        ],
      });

      for (const acc of customerAccounts) {
        let changed = false;
        if (pump && !acc.petrolPumpId) {
          acc.petrolPumpId = pump._id;
          changed = true;
        }
        if (!acc.customerUserId && acc.userId) {
          acc.customerUserId = acc.userId;
          changed = true;
        }
        if (!acc.customerName) {
          if (acc.customerUserId) {
            const u = await User.findById(acc.customerUserId).select('name');
            acc.customerName = u?.name || acc.customerCode;
          } else {
            acc.customerName = acc.customerCode;
          }
          changed = true;
        }

        if (changed) {
          report.customerAccountsToUpdate += 1;
          if (!isDryRun) {
            await acc.save({ validateBeforeSave: false });
          }
        }
      }

      // Migrate Transactions for this admin
      const accountIds = customerAccounts.map((c) => c._id);
      if (pump) {
        const txQuery = {
          $or: [
            { customerId: { $in: accountIds } },
            { createdBy: admin._id },
          ],
          $and: [
            {
              $or: [
                { petrolPumpId: { $exists: false } },
                { petrolPumpId: null },
              ],
            },
          ],
        };

        const txCount = await Transaction.countDocuments(txQuery);
        if (txCount > 0) {
          report.transactionsToUpdate += txCount;
          if (!isDryRun) {
            await Transaction.updateMany(txQuery, { $set: { petrolPumpId: pump._id } });
            logger.info({ pumpId: pump._id, modified: txCount }, 'Migrated transactions to PetrolPump');
          }
        }

        // Migrate DailyRecords for this admin
        const drQuery = {
          $or: [
            { createdBy: admin._id },
            { petrolPumpId: { $exists: false } },
            { petrolPumpId: null },
          ],
        };

        const drCount = await DailyRecord.countDocuments(drQuery);
        if (drCount > 0) {
          report.dailyRecordsToUpdate += drCount;
          if (!isDryRun) {
            await DailyRecord.updateMany(drQuery, { $set: { petrolPumpId: pump._id } });
            logger.info({ pumpId: pump._id, modified: drCount }, 'Migrated daily records to PetrolPump');
          }
        }
      }
    }

    // Check orphan transactions
    const orphanTxQuery = { $or: [{ petrolPumpId: { $exists: false } }, { petrolPumpId: null }] };
    const orphanTxCount = await Transaction.countDocuments(orphanTxQuery);
    if (orphanTxCount > 0) {
      report.orphanTransactions = orphanTxCount;
      if (defaultPump && !isDryRun) {
        await Transaction.updateMany(orphanTxQuery, { $set: { petrolPumpId: defaultPump._id } });
        logger.info({ modified: orphanTxCount }, 'Assigned orphan transactions to default PetrolPump');
      }
    }

    // Index synchronization (only executed in live mode)
    if (!isDryRun) {
      try {
        const custColl = mongoose.connection.collection('customerpumpaccounts');
        const existingCustIndexes = await custColl.indexes();
        for (const idx of existingCustIndexes) {
          if (idx.key && idx.key.customerCode === 1 && Object.keys(idx.key).length === 1 && idx.unique) {
            await custColl.dropIndex(idx.name);
            logger.info(`Dropped obsolete unique index on customerCode: ${idx.name}`);
          }
        }
      } catch (err) {
        logger.debug({ err: err.message }, 'Notice when checking customer indexes');
      }

      try {
        const drColl = mongoose.connection.collection('dailyrecords');
        const existingDrIndexes = await drColl.indexes();
        for (const idx of existingDrIndexes) {
          if (idx.key && idx.key.date === 1 && Object.keys(idx.key).length === 1 && idx.unique) {
            await drColl.dropIndex(idx.name);
            logger.info(`Dropped obsolete unique index on date: ${idx.name}`);
          }
        }
      } catch (err) {
        logger.debug({ err: err.message }, 'Notice when checking daily record indexes');
      }

      // Safe index creation (additive - will not drop unmanaged indexes)
      try {
        await CustomerPumpAccount.createIndexes();
        await DailyRecord.createIndexes();
        await Transaction.createIndexes();
        await PetrolPump.createIndexes();
        await User.createIndexes();
        logger.info('Schema indexes verified successfully');
      } catch (idxErr) {
        logger.warn({ err: idxErr.message }, 'Notice during index creation');
      }
    }

    const totalModified =
      report.pumpsToCreate +
      report.adminsToUpdate +
      report.customerAccountsToUpdate +
      report.transactionsToUpdate +
      report.dailyRecordsToUpdate +
      report.orphanTransactions;

    if (!isDryRun && migrationRecord) {
      migrationRecord.status = 'completed';
      migrationRecord.recordsInspected = report.adminsFound;
      migrationRecord.recordsUpdated = totalModified;
      migrationRecord.completedAt = new Date();
      migrationRecord.details = report;
      await migrationRecord.save();
    }

    logger.info(
      { report, isDryRun, totalModified },
      `Migration ${isDryRun ? 'DRY-RUN ' : ''}finished successfully`
    );

    if (options.disconnect) await mongoose.disconnect();
    return report;
  } catch (err) {
    logger.error({ err: err.message }, 'Migration encountered an error');
    if (!isDryRun && migrationRecord) {
      migrationRecord.status = 'failed';
      migrationRecord.error = err.message;
      await migrationRecord.save();
    }
    if (options.disconnect) await mongoose.disconnect();
    throw err;
  }
};

if (require.main === module) {
  runMigration({ disconnect: true })
    .then((report) => {
      console.log('\n=======================================');
      console.log('MIGRATION REPORT:');
      console.log(JSON.stringify(report, null, 2));
      console.log('=======================================\n');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err.message);
      process.exit(1);
    });
}

module.exports = runMigration;
