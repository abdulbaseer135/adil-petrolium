'use strict';
/**
 * Customer Self-Registration, Multi-Pump Account Linking & Tenant Isolation Tests
 */

const { expect } = require('chai');
const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const PetrolPump = require('../../src/models/PetrolPump');
const CustomerPumpAccount = require('../../src/models/CustomerPumpAccount');
const CustomerLinkRequest = require('../../src/models/CustomerLinkRequest');
const Transaction = require('../../src/models/Transaction');
const { connectTestDB, clearDB, closeDB } = require('../helpers/db');
const { createAdmin, createPetrolPump } = require('../fixtures/factories');
const { loginWithCsrf, postWithCsrf, patchWithCsrf } = require('../helpers/csrf');

describe('Customer Self-Registration, Multi-Pump Account Linking & Tenant Isolation', function () {
  this.timeout(25000);

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  after(async () => {
    await clearDB();
    await closeDB();
  });

  describe('1. Customer Public Self-Registration', () => {
    it('allows customer to create their own identity and strictly assigns role: customer', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/customer')
        .send({
          name: 'Ahmed Khan',
          email: 'ahmed@example.com',
          phone: '03001234567',
          password: 'CustomerPassword123!',
          role: 'admin', // Attempted privilege escalation
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.role).to.equal('customer');

      const savedUser = await User.findOne({ email: 'ahmed@example.com' }).select('+password');
      expect(savedUser).to.exist;
      expect(savedUser.role).to.equal('customer');
      expect(savedUser.status).to.equal('active');
      expect(savedUser.password).to.not.equal('CustomerPassword123!'); // Securely hashed
    });

    it('allows newly registered customer to log in with their own password', async () => {
      await request(app)
        .post('/api/v1/auth/register/customer')
        .send({
          name: 'Ahmed Khan',
          email: 'ahmed@example.com',
          phone: '03001234567',
          password: 'CustomerPassword123!',
        });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'ahmed@example.com',
          password: 'CustomerPassword123!',
        });

      expect(loginRes.status).to.equal(200);
      expect(loginRes.body.data.role).to.equal('customer');
      expect(loginRes.body.data.email).to.equal('ahmed@example.com');
    });
  });

  describe('2. Station Admin Customer Creation (Decoupled Identity)', () => {
    it('creates CustomerPumpAccount with customerUserId: null and no password/user created', async () => {
      const admin = await createAdmin();
      const adminAgent = request.agent(app);
      await loginWithCsrf(adminAgent, { email: admin.email, password: 'Admin@12345678' });

      const res = await postWithCsrf(adminAgent, '/api/v1/customers', {
        name: 'Ahmed Logistics',
        customerCode: 'AL-100',
        phone: '03001234567',
        creditLimit: 250000,
        openingBalance: 40000,
      });

      expect(res.status).to.equal(201);
      const accountId = res.body.data._id;

      const account = await CustomerPumpAccount.findById(accountId);
      expect(account).to.exist;
      expect(account.customerUserId).to.be.null;
      expect(account.status).to.equal('unclaimed');
      expect(account.customerCode).to.equal('AL-100');
      expect(account.currentBalance).to.equal(40000);

      // Verify no User was created with this email/phone
      const user = await User.findOne({ phone: '03001234567' });
      expect(user).to.be.null;
    });

    it('allows admin to record fuel sales and payments before customer registers online', async () => {
      const admin = await createAdmin();
      const adminAgent = request.agent(app);
      await loginWithCsrf(adminAgent, { email: admin.email, password: 'Admin@12345678' });

      // Create ledger account
      const custRes = await postWithCsrf(adminAgent, '/api/v1/customers', {
        name: 'Tariq Transport',
        customerCode: 'TT-050',
        phone: '03129876543',
        openingBalance: 10000,
      });
      const accountId = custRes.body.data._id;

      // Add fuel sale to the unclaimed ledger account
      const txRes = await postWithCsrf(adminAgent, '/api/v1/transactions', {
        customerId: accountId,
        transactionType: 'fuel_sale',
        fuelType: 'hsd',
        fuelQuantity: 100,
        rate: 260,
      });

      expect(txRes.status).to.equal(201);
      expect(txRes.body.data.customerAccountId).to.equal(accountId);
      expect(txRes.body.data.totalAmount).to.equal(26000);
      expect(txRes.body.data.updatedBalance).to.equal(36000);

      const updatedAccount = await CustomerPumpAccount.findById(accountId);
      expect(updatedAccount.currentBalance).to.equal(36000);
    });
  });

  describe('3. Customer Link Request & Approval Workflow', () => {
    it('customer submits existing_account request; no financial data disclosed prior to admin approval', async () => {
      // 1. Admin creates station account and records transactions
      const admin = await createAdmin();
      const pumpId = admin.petrolPumpId;

      const unclaimedAccount = await CustomerPumpAccount.create({
        petrolPumpId: pumpId,
        customerCode: 'AP-100',
        customerName: 'Ahmed Traders',
        phone: '03001112233',
        creditLimit: 500000,
        currentBalance: 75000,
        status: 'unclaimed',
        customerUserId: null,
      });

      // 2. Customer registers online
      const customer = await User.create({
        name: 'Ahmed Khan',
        email: 'ahmed@online.com',
        phone: '03001112233',
        password: 'Password123!',
        role: 'customer',
        status: 'active',
      });

      const customerAgent = request.agent(app);
      await loginWithCsrf(customerAgent, { email: customer.email, password: 'Password123!' });

      // 3. Customer submits link request
      const reqRes = await postWithCsrf(customerAgent, '/api/v1/customer/pumps/link-request', {
        petrolPumpId: pumpId.toString(),
        requestType: 'existing_account',
        requestedCustomerCode: 'AP-100',
        requestedPhone: '03001112233',
      });

      expect(reqRes.status).to.equal(201);
      expect(reqRes.body.success).to.be.true;
      // CRITICAL SECURITY: Ensure no balance, ledger, or statement is leaked
      expect(reqRes.body.data.currentBalance).to.be.undefined;
      expect(reqRes.body.data.creditLimit).to.be.undefined;
      expect(reqRes.body.data.customerPumpAccount).to.be.undefined;
      expect(reqRes.body.data.status).to.equal('pending');

      // Verify DB state: account remains unclaimed until approved
      const accountAfterRequest = await CustomerPumpAccount.findById(unclaimedAccount._id);
      expect(accountAfterRequest.customerUserId).to.be.null;
      expect(accountAfterRequest.status).to.equal('unclaimed');

      // 4. Duplicate pending request is prevented
      const dupRes = await postWithCsrf(customerAgent, '/api/v1/customer/pumps/link-request', {
        petrolPumpId: pumpId.toString(),
        requestType: 'existing_account',
        requestedCustomerCode: 'AP-100',
      });
      expect(dupRes.status).to.equal(400);
      expect(dupRes.body.message).to.match(/pending request/i);
    });

    it('correct station admin approves request; account becomes linked and past history is accessible', async () => {
      const admin = await createAdmin();
      const pumpId = admin.petrolPumpId;

      const account = await CustomerPumpAccount.create({
        petrolPumpId: pumpId,
        customerCode: 'AP-200',
        customerName: 'Babar Logistics',
        phone: '03009998877',
        creditLimit: 300000,
        currentBalance: 55000,
        status: 'unclaimed',
        customerUserId: null,
      });

      // Record a transaction before the customer joins
      await Transaction.create({
        petrolPumpId: pumpId,
        customerAccountId: account._id,
        customerId: account._id,
        userId: admin._id,
        createdBy: admin._id,
        transactionType: 'fuel_sale',
        fuelType: 'pmg',
        fuelQuantity: 100,
        rate: 250,
        totalAmount: 25000,
        previousBalance: 30000,
        updatedBalance: 55000,
        paymentReceived: 0,
      });

      const customer = await User.create({
        name: 'Babar Azam',
        email: 'babar@cricket.pk',
        phone: '03009998877',
        password: 'Password123!',
        role: 'customer',
        status: 'active',
      });

      const linkRequest = await CustomerLinkRequest.create({
        customerUserId: customer._id,
        petrolPumpId: pumpId,
        customerPumpAccountId: account._id,
        requestType: 'existing_account',
        requestedCustomerCode: 'AP-200',
        requestedPhone: '03009998877',
        status: 'pending',
      });

      // Admin logs in and approves
      const adminAgent = request.agent(app);
      await loginWithCsrf(adminAgent, { email: admin.email, password: 'Admin@12345678' });

      const approveRes = await patchWithCsrf(
        adminAgent,
        `/api/v1/admin/customer-links/${linkRequest._id}/approve`,
        {}
      );

      expect(approveRes.status).to.equal(200);
      expect(approveRes.body.data.status).to.equal('approved');

      // Verify CustomerPumpAccount is now active and linked to the customer user
      const linkedAccount = await CustomerPumpAccount.findById(account._id);
      expect(linkedAccount.customerUserId.toString()).to.equal(customer._id.toString());
      expect(linkedAccount.status).to.equal('active');

      // Customer logs in and can view their account and prior transaction history
      const customerAgent = request.agent(app);
      await loginWithCsrf(customerAgent, { email: customer.email, password: 'Password123!' });

      const myAccountsRes = await customerAgent.get('/api/v1/customer/pumps/my-accounts');
      expect(myAccountsRes.status).to.equal(200);
      expect(myAccountsRes.body.data).to.have.lengthOf(1);
      expect(myAccountsRes.body.data[0].customerCode).to.equal('AP-200');
      expect(myAccountsRes.body.data[0].currentBalance).to.equal(55000);

      // Verify customer can see past transactions
      const txRes = await customerAgent.get(
        `/api/v1/customer/pumps/${account._id}/transactions`
      );
      expect(txRes.status).to.equal(200);
      expect(txRes.body.data).to.have.lengthOf(1);
      expect(txRes.body.data[0].totalAmount).to.equal(25000);
    });

    it('foreign admin cannot approve or access another station\'s customer link requests (Tenant Isolation)', async () => {
      const adminA = await createAdmin();
      const adminB = await createAdmin();

      const customer = await User.create({
        name: 'Rizwan',
        email: 'rizwan@example.com',
        phone: '03005554433',
        password: 'Password123!',
        role: 'customer',
        status: 'active',
      });

      const requestA = await CustomerLinkRequest.create({
        customerUserId: customer._id,
        petrolPumpId: adminA.petrolPumpId,
        requestType: 'new_relationship',
        status: 'pending',
      });

      // Admin B attempts to approve Pump A's request
      const adminBAgent = request.agent(app);
      await loginWithCsrf(adminBAgent, { email: adminB.email, password: 'Admin@12345678' });

      const res = await patchWithCsrf(
        adminBAgent,
        `/api/v1/admin/customer-links/${requestA._id}/approve`,
        { customerCode: 'RZ-01' }
      );

      expect(res.status).to.be.oneOf([403, 404]);

      // Request must remain pending
      const checkReq = await CustomerLinkRequest.findById(requestA._id);
      expect(checkReq.status).to.equal('pending');
    });

    it('admin rejection sets status: rejected with reason and preserves auditability without deleting', async () => {
      const admin = await createAdmin();
      const customer = await User.create({
        name: 'Unknown User',
        email: 'unknown@example.com',
        phone: '03000000000',
        password: 'Password123!',
        role: 'customer',
        status: 'active',
      });

      const reqRecord = await CustomerLinkRequest.create({
        customerUserId: customer._id,
        petrolPumpId: admin.petrolPumpId,
        requestType: 'existing_account',
        requestedCustomerCode: 'FAKE-999',
        status: 'pending',
      });

      const adminAgent = request.agent(app);
      await loginWithCsrf(adminAgent, { email: admin.email, password: 'Admin@12345678' });

      const rejectRes = await patchWithCsrf(
        adminAgent,
        `/api/v1/admin/customer-links/${reqRecord._id}/reject`,
        { rejectionReason: 'Customer code not recognized on ledger' }
      );

      expect(rejectRes.status).to.equal(200);
      expect(rejectRes.body.data.status).to.equal('rejected');
      expect(rejectRes.body.data.rejectionReason).to.equal('Customer code not recognized on ledger');

      const savedReq = await CustomerLinkRequest.findById(reqRecord._id);
      expect(savedReq).to.exist;
      expect(savedReq.status).to.equal('rejected');
    });
  });

  describe('4. Multi-Pump Separation & Ledger Independence', () => {
    it('customer connected to Pump A and Pump B maintains completely independent balances and ledgers', async () => {
      const adminA = await createAdmin();
      const adminB = await createAdmin();

      const customer = await User.create({
        name: 'Multi Station Customer',
        email: 'multi@fleet.com',
        phone: '03211112233',
        password: 'Password123!',
        role: 'customer',
        status: 'active',
      });

      // Pump A account: Balance = 80,000 PKR
      const accountA = await CustomerPumpAccount.create({
        petrolPumpId: adminA.petrolPumpId,
        customerUserId: customer._id,
        customerCode: 'PA-01',
        customerName: customer.name,
        phone: customer.phone,
        currentBalance: 80000,
        creditLimit: 200000,
        status: 'active',
      });

      // Pump B account: Balance = 15,000 PKR
      const accountB = await CustomerPumpAccount.create({
        petrolPumpId: adminB.petrolPumpId,
        customerUserId: customer._id,
        customerCode: 'PB-01',
        customerName: customer.name,
        phone: customer.phone,
        currentBalance: 15000,
        creditLimit: 50000,
        status: 'active',
      });

      // Admin A records a 20,000 fuel purchase on Pump A
      const adminAAgent = request.agent(app);
      await loginWithCsrf(adminAAgent, { email: adminA.email, password: 'Admin@12345678' });
      await postWithCsrf(adminAAgent, '/api/v1/transactions', {
        customerId: accountA._id,
        transactionType: 'fuel_sale',
        fuelType: 'pmg',
        fuelQuantity: 100,
        rate: 200,
      });

      // Customer inspects accounts
      const customerAgent = request.agent(app);
      await loginWithCsrf(customerAgent, { email: customer.email, password: 'Password123!' });

      const accountsRes = await customerAgent.get('/api/v1/customer/pumps/my-accounts');
      expect(accountsRes.status).to.equal(200);
      expect(accountsRes.body.data).to.have.lengthOf(2);

      const loadedA = accountsRes.body.data.find(
        (a) => a.petrolPumpId._id.toString() === adminA.petrolPumpId.toString()
      );
      const loadedB = accountsRes.body.data.find(
        (a) => a.petrolPumpId._id.toString() === adminB.petrolPumpId.toString()
      );

      // Verify Pump A balance increased to 100,000 PKR while Pump B remained untouched at 15,000 PKR
      expect(loadedA.currentBalance).to.equal(100000);
      expect(loadedB.currentBalance).to.equal(15000);
    });

    it('customer cannot access account details or transactions of an account belonging to another user (IDOR prevention)', async () => {
      const admin = await createAdmin();
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@test.com',
        phone: '03001111111',
        password: 'Password123!',
        role: 'customer',
        status: 'active',
      });
      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@test.com',
        phone: '03002222222',
        password: 'Password123!',
        role: 'customer',
        status: 'active',
      });

      const accountUser1 = await CustomerPumpAccount.create({
        petrolPumpId: admin.petrolPumpId,
        customerUserId: user1._id,
        customerCode: 'U1-01',
        customerName: user1.name,
        currentBalance: 50000,
        status: 'active',
      });

      const user2Agent = request.agent(app);
      await loginWithCsrf(user2Agent, { email: user2.email, password: 'Password123!' });

      // User 2 attempts to query User 1's dashboard
      const getRes = await user2Agent.get(`/api/v1/customer/pumps/${accountUser1._id}/dashboard`);
      expect(getRes.status).to.be.oneOf([403, 404]);

      // User 2 attempts to query User 1's transactions
      const txRes = await user2Agent.get(`/api/v1/customer/pumps/${accountUser1._id}/transactions`);
      expect(txRes.status).to.be.oneOf([403, 404]);
    });
  });
});
