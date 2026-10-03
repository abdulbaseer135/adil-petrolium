'use strict';

const { expect } = require('chai');
const mongoose = require('mongoose');
const { connectTestDB, clearDB, closeDB } = require('../helpers/db');
const User = require('../../src/models/User');
const PetrolPump = require('../../src/models/PetrolPump');
const CustomerPumpAccount = require('../../src/models/CustomerPumpAccount');
const Transaction = require('../../src/models/Transaction');
const MigrationHistory = require('../../src/models/MigrationHistory');
const seedSuperAdmin = require('../../src/scripts/seedSuperAdmin');
const runMigration = require('../../src/scripts/migrateMultiTenant');
const { assertTestDatabase, isTestDatabaseName } = require('../../src/utils/dbSafety');

describe('Database Protection & Data Integrity Integration Tests', () => {
  before(async () => {
    await connectTestDB();
    await clearDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  after(async () => {
    await clearDB();
    await closeDB();
  });

  it('connected database is strictly identified as a test database', () => {
    expect(mongoose.connection.name).to.be.a('string');
    expect(isTestDatabaseName(mongoose.connection.name)).to.be.true;
    expect(() => assertTestDatabase(mongoose.connection)).to.not.throw();
  });

  it('clearDB() refuses to clear if connected to a non-test database', async () => {
    const fakeNonTestConn = {
      name: 'petro_dealer',
      readyState: 1,
      collections: {
        users: { deleteMany: () => Promise.resolve() },
      },
    };

    expect(() => assertTestDatabase(fakeNonTestConn)).to.throw(
      /Refusing destructive operation against non-test database 'petro_dealer'/
    );
  });

  it('Super Admin seed is strictly idempotent and does not delete existing accounts', async () => {
    // 1. Create a regular customer account and an admin account
    const existingCustomer = await User.create({
      name: 'Protected Customer',
      email: 'customer.preserved@test.local',
      password: 'Password@1234',
      role: 'customer',
      status: 'active',
    });

    const existingAdmin = await User.create({
      name: 'Station Admin',
      email: 'admin.preserved@test.local',
      password: 'Password@1234',
      role: 'admin',
      status: 'approved',
    });

    // 2. Run seedSuperAdmin for the first time
    const seededFirst = await seedSuperAdmin();
    expect(seededFirst).to.exist;
    expect(seededFirst.role).to.equal('super_admin');

    // Verify existing users were NOT deleted
    const countAfterFirst = await User.countDocuments();
    expect(countAfterFirst).to.equal(3);

    const preservedCust = await User.findById(existingCustomer._id);
    expect(preservedCust).to.exist;
    expect(preservedCust.email).to.equal('customer.preserved@test.local');

    // 3. Re-run seedSuperAdmin a second time (should be completely idempotent)
    await connectTestDB(); // reconnect if seed disconnected
    const seededSecond = await seedSuperAdmin();
    expect(seededSecond).to.exist;
    expect(seededSecond.email).to.equal(seededFirst.email);

    // Total user count must still be 3 (no duplicates, no deletions)
    const countAfterSecond = await User.countDocuments();
    expect(countAfterSecond).to.equal(3);
  });

  it('multi-tenant migration dry-run does NOT modify any records', async () => {
    // Setup test admin without pump
    const admin = await User.create({
      name: 'DryRun Admin',
      email: 'dryrun.admin@test.local',
      password: 'Password@1234',
      role: 'admin',
      status: 'approved',
    });

    const report = await runMigration({ dryRun: true });
    expect(report.isDryRun).to.be.true;
    expect(report.adminsFound).to.be.at.least(1);
    expect(report.pumpsToCreate).to.be.at.least(1);

    await connectTestDB();
    // In dry-run, no pump should have been created in the database
    const pumpsCount = await PetrolPump.countDocuments({ ownerAdminId: admin._id });
    expect(pumpsCount).to.equal(0);

    // In dry-run, no migration history record should be created
    const historyCount = await MigrationHistory.countDocuments({ isDryRun: false });
    expect(historyCount).to.equal(0);
  });

  it('multi-tenant migration runs safely and rerun is idempotent', async () => {
    const admin = await User.create({
      name: 'Live Admin',
      email: 'live.admin@test.local',
      password: 'Password@1234',
      role: 'admin',
      status: 'approved',
    });

    // Run migration live
    const firstRun = await runMigration({ dryRun: false, force: true });
    expect(firstRun.isDryRun).to.be.false;

    await connectTestDB();
    const pump = await PetrolPump.findOne({ ownerAdminId: admin._id });
    expect(pump).to.exist;

    const migrationHistory = await MigrationHistory.findOne({ status: 'completed' });
    expect(migrationHistory).to.exist;

    // Second run should recognize existing completed migration and exit safely
    const secondRun = await runMigration({ dryRun: false });
    expect(secondRun.skipped).to.be.true;
    expect(secondRun.reason).to.equal('already_completed');

    await connectTestDB();
    // Pump count must remain 1
    const pumpCount = await PetrolPump.countDocuments({ ownerAdminId: admin._id });
    expect(pumpCount).to.equal(1);
  });
});
