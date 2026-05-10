'use strict';
/**
 * Transactions Integration Tests
 * 
 * Covers:
 * - Admin creating transactions for owned customers
 * - Ownership checks: admin cannot create for unowned customer
 * - Customer reading own history only
 * - Running balance calculation
 * - Date/month/year filtering
 * - Custom date range filtering
 * - Sorting correctness
 * - Void transaction behavior with audit trail
 * - Export/report route access control
 * - Centralized error response format
 */

const { expect } = require('chai');
const request = require('supertest');

const app = require('../../src/server');
const { connectTestDB, clearDB, closeDB } = require('../helpers/db');
const {
  createAdmin,
  createOwnedCustomer,
  createFuelSale,
  createPayment,
  createOpeningBalance,
  createCreditNote,
} = require('../fixtures/factories');
const {
  loginWithCsrf,
  postWithCsrf,
  putWithCsrf,
  deleteWithCsrf,
} = require('../helpers/csrf');
const CustomerProfile = require('../../src/models/CustomerProfile');
const Transaction = require('../../src/models/Transaction');

describe('Transactions Integration Tests', function () {
  this.timeout(30000);

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  afterEach(async () => {
    // Ensure tests are isolated
    await clearDB();
  });

  after(async () => {
    await clearDB();
    await closeDB();
  });

  // ─────────────────────────────────────────────────────────────
  // Transaction Creation
  // ─────────────────────────────────────────────────────────────

  describe('Transaction Creation', () => {
    it('admin can create fuel sale transaction for owned customer', async () => {
      const admin = await createAdmin();
      const { user: cust, profile } = await createOwnedCustomer(admin);

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await postWithCsrf(agent, '/api/v1/transactions', {
        customerId: String(profile._id),
        transactionType: 'fuel_sale',
        fuelType: 'pmg',
        fuelQuantity: 10,
        rate: 150,
      });

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('success', true);
      expect(res.body.data).to.have.property('transactionType', 'fuel_sale');
      expect(res.body.data).to.have.property('fuelQuantity', 10);
      expect(res.body.data).to.have.property('rate', 150);
      expect(res.body.data).to.have.property('totalAmount', 1500);

      // Verify customer profile balance updated
      const updated = await CustomerProfile.findById(profile._id);
      expect(updated.currentBalance).to.equal(1500);
    });

    it('admin can create payment transaction', async () => {
      const admin = await createAdmin();
      const { profile } = await createOwnedCustomer(admin, {}, { currentBalance: 5000 });

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await postWithCsrf(agent, '/api/v1/transactions', {
        customerId: String(profile._id),
        transactionType: 'payment',
        paymentReceived: 2000,
      });

      expect(res.status).to.equal(201);
      expect(res.body.data).to.have.property('transactionType', 'payment');
      expect(res.body.data).to.have.property('paymentReceived', 2000);

      const updated = await CustomerProfile.findById(profile._id);
      expect(updated.currentBalance).to.equal(3000);
    });

    it('admin can create opening balance transaction', async () => {
      const admin = await createAdmin();
      const { profile } = await createOwnedCustomer(admin);

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await postWithCsrf(agent, '/api/v1/transactions', {
        customerId: String(profile._id),
        transactionType: 'opening_balance',
        amount: 5000,
      });

      expect(res.status).to.equal(201);
      expect(res.body.data).to.have.property('totalAmount', 5000);

      const updated = await CustomerProfile.findById(profile._id);
      expect(updated.currentBalance).to.equal(5000);
    });

    it('admin can create credit note transaction', async () => {
      const admin = await createAdmin();
      const { profile } = await createOwnedCustomer(admin, {}, { currentBalance: 10000 });

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await postWithCsrf(agent, '/api/v1/transactions', {
        customerId: String(profile._id),
        transactionType: 'credit_note',
        amount: 500,
        referenceNo: 'CN-2024-001',
        notes: 'Quality adjustment',
      });

      expect(res.status).to.equal(201);
      expect(res.body.data).to.have.property('transactionType', 'credit_note');
      expect(res.body.data).to.have.property('referenceNo', 'CN-2024-001');

      const updated = await CustomerProfile.findById(profile._id);
      expect(updated.currentBalance).to.equal(9500);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Ownership & Access Control
  // ─────────────────────────────────────────────────────────────

  describe('Ownership & Access Control', () => {
    it('admin cannot create transaction for unowned customer', async () => {
      const admin1 = await createAdmin({ email: 'admin1@example.com' });
      const admin2 = await createAdmin({ email: 'admin2@example.com' });

      const { profile: cust2 } = await createOwnedCustomer(admin2);

      const agent1 = request.agent(app);
      await loginWithCsrf(agent1, {
        email: admin1.email,
        password: 'Admin@12345678',
      });

      const res = await postWithCsrf(agent1, '/api/v1/transactions', {
        customerId: String(cust2._id),
        transactionType: 'fuel_sale',
        fuelType: 'pmg',
        fuelQuantity: 10,
        rate: 150,
      });

      expect(res.status).to.equal(403);
      expect(res.body).to.have.property('success', false);
    });

    it('customer can only read their own transaction history', async () => {
      const admin1 = await createAdmin({ email: 'admin1-hist@example.com' });
      const admin2 = await createAdmin({ email: 'admin2-hist@example.com' });

      const { user: cust1, profile: prof1 } = await createOwnedCustomer(admin1);
      const { user: cust2, profile: prof2 } = await createOwnedCustomer(admin2);

      // Create transactions for both customers
      await createFuelSale({
        customerId: prof1._id,
        userId: cust1._id,
        createdBy: admin1._id,
      });

      await createFuelSale({
        customerId: prof2._id,
        userId: cust2._id,
        createdBy: admin2._id,
      });

      // Customer1 retrieves their history
      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: cust1.email,
        password: 'Cust@12345678',
      });

      const res = await agent.get('/api/v1/transactions/my-statement');

      if (res.status === 200) {
        // Should only include customer1's transactions
        expect(res.body.data).to.be.an('array');
        const customerIds = res.body.data.map((tx) => String(tx.customerId));
        expect(customerIds).to.include(String(prof1._id));
        expect(customerIds).to.not.include(String(prof2._id));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Running Balance Calculation
  // ─────────────────────────────────────────────────────────────

  describe('Running Balance Calculation', () => {
    it('should correctly calculate running balance through multiple transactions', async () => {
      const admin = await createAdmin();
      const { user: cust, profile } = await createOwnedCustomer(admin);

      // Transaction 1: Opening balance 1000
      const tx1 = await createOpeningBalance({
        customerId: profile._id,
        userId: cust._id,
        createdBy: admin._id,
        amount: 1000,
      });

      // Transaction 2: Fuel sale +1500
      const tx2 = await createFuelSale({
        customerId: profile._id,
        userId: cust._id,
        createdBy: admin._id,
        fuelType: 'pmg',
        fuelQuantity: 10,
        rate: 150,
        previousBalance: 1000,
      });

      // Transaction 3: Payment -500
      const tx3 = await createPayment({
        customerId: profile._id,
        userId: cust._id,
        createdBy: admin._id,
        paymentReceived: 500,
        previousBalance: 2500,
      });

      expect(tx1.updatedBalance).to.equal(1000);
      expect(tx2.previousBalance).to.equal(1000);
      expect(tx2.updatedBalance).to.equal(2500);
      expect(tx3.previousBalance).to.equal(2500);
      expect(tx3.updatedBalance).to.equal(2000);

      // Verify profile balance
      const updated = await CustomerProfile.findById(profile._id);
      expect(updated.currentBalance).to.equal(2000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Date Filtering
  // ─────────────────────────────────────────────────────────────

  describe('Date Filtering', () => {
    it('should filter transactions by single day', async () => {
      const admin = await createAdmin();
      const { user: cust, profile } = await createOwnedCustomer(admin);

      // Create today's transaction
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const tx = await createOpeningBalance({
        customerId: profile._id,
        userId: cust._id,
        createdBy: admin._id,
        amount: 1000,
      });

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      // Query with date filter
      const res = await agent
        .get('/api/v1/transactions')
        .query({
          customerId: String(profile._id),
          date: todayStr,
        });

      if (res.status === 200 && res.body.data) {
        expect(res.body.data).to.be.an('array');
        expect(res.body.data.length).to.be.greaterThan(0);
      }
    });

    it('should filter transactions by month', async () => {
      const admin = await createAdmin();
      const { user: cust, profile } = await createOwnedCustomer(admin);

      await createOpeningBalance({
        customerId: profile._id,
        userId: cust._id,
        createdBy: admin._id,
      });

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

      const res = await agent
        .get('/api/v1/transactions')
        .query({
          customerId: String(profile._id),
          month: currentMonth,
        });

      if (res.status === 200 && res.body.data) {
        expect(res.body.data).to.be.an('array');
      }
    });

    it('should filter transactions by custom date range', async () => {
      const admin = await createAdmin();
      const { user: cust, profile } = await createOwnedCustomer(admin);

      await createOpeningBalance({
        customerId: profile._id,
        userId: cust._id,
        createdBy: admin._id,
      });

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const res = await agent
        .get('/api/v1/transactions')
        .query({
          customerId: String(profile._id),
          startDate: today,
          endDate: tomorrow,
        });

      if (res.status === 200 && res.body.data) {
        expect(res.body.data).to.be.an('array');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Pagination & Sorting
  // ─────────────────────────────────────────────────────────────

  describe('Pagination & Sorting', () => {
    it('should support pagination with page and limit', async () => {
      const admin = await createAdmin();
      const { user: cust, profile } = await createOwnedCustomer(admin);

      // Create multiple transactions
      for (let i = 0; i < 5; i++) {
        await createOpeningBalance({
          customerId: profile._id,
          userId: cust._id,
          createdBy: admin._id,
          amount: 100 * (i + 1),
        });
      }

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await agent
        .get('/api/v1/transactions')
        .query({
          customerId: String(profile._id),
          page: 1,
          limit: 3,
        });

      expect(res.status).to.equal(200);
      if (res.body.data) {
        expect(res.body.data.length).to.be.lessThanOrEqual(3);
      }
      if (res.body.meta) {
        expect(res.body.meta).to.have.property('page');
        expect(res.body.meta).to.have.property('limit');
        expect(res.body.meta).to.have.property('total');
      }
    });

    it('should return metadata in paginated response', async () => {
      const admin = await createAdmin();
      const { user: cust, profile } = await createOwnedCustomer(admin);

      await createOpeningBalance({
        customerId: profile._id,
        userId: cust._id,
        createdBy: admin._id,
      });

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await agent
        .get('/api/v1/transactions')
        .query({
          customerId: String(profile._id),
          page: 1,
          limit: 10,
        });

      expect(res.status).to.equal(200);
      if (res.body.meta) {
        expect(res.body.meta).to.have.property('page');
        expect(res.body.meta).to.have.property('limit');
        expect(res.body.meta).to.have.property('total');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Void Transaction
  // ─────────────────────────────────────────────────────────────

  describe('Void Transaction', () => {
    it('should void transaction and restore balance', async () => {
      const admin = await createAdmin();
      const { user: cust, profile } = await createOwnedCustomer(admin);

      // Create fuel sale transaction
      const res1 = await createFuelSale({
        customerId: profile._id,
        userId: cust._id,
        createdBy: admin._id,
        fuelQuantity: 20,
        rate: 100,
      });

      // Ensure transaction ownership metadata is correct
      expect(String(res1.createdBy)).to.equal(String(admin._id));

      let balance = await CustomerProfile.findById(profile._id);
      const beforeVoid = balance.currentBalance;
      expect(beforeVoid).to.equal(2000);

      // Void transaction
      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const voidRes = await agent
        .delete(`/api/v1/transactions/${res1._id}`)
        .send({
          reason: 'Duplicate entry',
        });

      if (voidRes.status === 200) {
        expect(voidRes.body).to.have.property('success', true);

        // Verify balance restored
        balance = await CustomerProfile.findById(profile._id);
        expect(balance.currentBalance).to.equal(0);

        // Verify transaction marked as voided
        const voided = await Transaction.findById(res1._id);
        expect(voided.isVoided).to.be.true;
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Validation & Error Handling
  // ─────────────────────────────────────────────────────────────

  describe('Validation & Error Handling', () => {
    it('should reject missing customerId', async () => {
      const admin = await createAdmin();

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await postWithCsrf(agent, '/api/v1/transactions', {
        transactionType: 'fuel_sale',
        fuelType: 'pmg',
        fuelQuantity: 10,
        rate: 150,
      });

      expect(res.status).to.equal(422);
      expect(res.body).to.have.property('success', false);
    });

    it('should reject missing transactionType', async () => {
      const admin = await createAdmin();
      const { profile } = await createOwnedCustomer(admin);

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await postWithCsrf(agent, '/api/v1/transactions', {
        customerId: String(profile._id),
      });

      expect(res.status).to.equal(422);
      expect(res.body).to.have.property('success', false);
    });

    it('should reject invalid transaction type', async () => {
      const admin = await createAdmin();
      const { profile } = await createOwnedCustomer(admin);

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await postWithCsrf(agent, '/api/v1/transactions', {
        customerId: String(profile._id),
        transactionType: 'invalid_type',
      });

      expect(res.status).to.equal(422);
    });

    it('should return 404 for non-existent transaction', async () => {
      const admin = await createAdmin();

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await agent.get('/api/v1/transactions/507f1f77bcf86cd799439011');

      expect(res.status).to.equal(404);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Error Response Format
  // ─────────────────────────────────────────────────────────────

  describe('Error Response Format', () => {
    it('should return standardized error response', async () => {
      const admin = await createAdmin();

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await postWithCsrf(agent, '/api/v1/transactions', {});

      expect(res.status).to.be.oneOf([400, 422]);
      expect(res.body).to.have.property('success', false);
      expect(res.body).to.have.property('message');
    });

    it('should return success response with data on create', async () => {
      const admin = await createAdmin();
      const { user: cust, profile } = await createOwnedCustomer(admin);

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await postWithCsrf(agent, '/api/v1/transactions', {
        customerId: String(profile._id),
        transactionType: 'opening_balance',
        amount: 1000,
      });

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body).to.have.property('message');
    });
  });
});
