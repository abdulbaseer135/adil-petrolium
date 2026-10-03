'use strict';

const { expect } = require('chai');
const request = require('supertest');
const app = require('../../src/server');
const { connectTestDB, clearDB, closeDB } = require('../helpers/db');
const { loginWithCsrf, getCSRFToken } = require('../helpers/csrf');
const User = require('../../src/models/User');
const PetrolPump = require('../../src/models/PetrolPump');
const CustomerPumpAccount = require('../../src/models/CustomerPumpAccount');
const Transaction = require('../../src/models/Transaction');
const {
  createAdmin,
  createSuperAdmin,
  createCustomer,
  createPetrolPump,
} = require('../fixtures/factories');

describe('Multi-Tenant & Super Admin Architecture Tests', function () {
  this.timeout(30000);

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  after(async () => {
    await closeDB();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Super Admin Lifecycle & Approvals
  // ─────────────────────────────────────────────────────────────
  describe('Super Admin & Pump Registration Lifecycle', () => {
    it('admin registration creates pending admin and petrol pump', async () => {
      const { token, cookie } = await getCSRFToken();
      const res = await request(app)
        .post('/api/v1/auth/register/admin')
        .set('X-XSRF-TOKEN', token || '')
        .set('Cookie', cookie || '')
        .send({
          name: 'Pending Admin',
          email: 'pendingadmin@example.com',
          password: 'Password@123',
          phone: '03001234567',
          pumpName: 'Green Star Petroleum',
          registrationNumber: 'REG-12345',
          businessPhone: '03007654321',
          businessEmail: 'contact@greenstar.com',
          city: 'Lahore',
          address: 'Main Boulevard Gulberg',
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.user.status).to.equal('pending');
      expect(res.body.data.pump.status).to.equal('pending');

      // Verify pending admin cannot log in before approval
      const agent = request.agent(app);
      const loginRes = await agent
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', token || '')
        .set('Cookie', cookie || '')
        .send({
          email: 'pendingadmin@example.com',
          password: 'Password@123',
        });

      expect(loginRes.status).to.equal(403);
      expect(loginRes.body.message).to.match(/pending approval/i);
    });

    it('super admin can view pending pumps and approve them', async () => {
      const superAdmin = await createSuperAdmin();
      const pump = await createPetrolPump({ status: 'pending' });
      const admin = await createAdmin({
        email: 'appr-admin@example.com',
        status: 'pending',
        petrolPumpId: pump._id,
      });
      pump.ownerAdminId = admin._id;
      pump.admins = [admin._id];
      await pump.save();

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: superAdmin.email,
        password: 'SuperAdmin@12345678',
      });

      // 1. Get pending list
      const listRes = await agent.get('/api/v1/super-admin/petrol-pumps?status=pending');
      expect(listRes.status).to.equal(200);
      expect(listRes.body.data).to.be.an('array');
      expect(listRes.body.data.some((p) => String(p._id) === String(pump._id))).to.be.true;

      // 2. Approve pump
      const approveRes = await agent
        .patch(`/api/v1/super-admin/petrol-pumps/${pump._id}/approve`)
        .send();
      expect(approveRes.status).to.equal(200);
      expect(approveRes.body.data.status).to.equal('approved');

      // Verify admin and pump are now active/approved
      const updatedPump = await PetrolPump.findById(pump._id);
      expect(updatedPump.status).to.equal('approved');

      const updatedAdmin = await User.findById(admin._id);
      expect(updatedAdmin.status).to.equal('approved');
    });

    it('super admin can reject a pending petrol pump with reason', async () => {
      const superAdmin = await createSuperAdmin();
      const pump = await createPetrolPump({ status: 'pending' });

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: superAdmin.email,
        password: 'SuperAdmin@12345678',
      });

      const rejectRes = await agent
        .patch(`/api/v1/super-admin/petrol-pumps/${pump._id}/reject`)
        .send({ reason: 'Invalid business license document' });

      expect(rejectRes.status).to.equal(200);
      expect(rejectRes.body.data.status).to.equal('rejected');
      expect(rejectRes.body.data.rejectionReason).to.equal('Invalid business license document');
    });

    it('super admin can suspend and reactivate an approved petrol pump', async () => {
      const superAdmin = await createSuperAdmin();
      const pump = await createPetrolPump({ status: 'approved' });

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: superAdmin.email,
        password: 'SuperAdmin@12345678',
      });

      // Suspend
      const suspendRes = await agent
        .patch(`/api/v1/super-admin/petrol-pumps/${pump._id}/suspend`)
        .send({ reason: 'Payment compliance issue' });
      expect(suspendRes.status).to.equal(200);
      expect(suspendRes.body.data.status).to.equal('suspended');

      // Reactivate
      const reactivateRes = await agent
        .patch(`/api/v1/super-admin/petrol-pumps/${pump._id}/reactivate`)
        .send();
      expect(reactivateRes.status).to.equal(200);
      expect(reactivateRes.body.data.status).to.equal('approved');
    });

    it('accurately reflects Total Stations and pending/active metrics before and after approval', async () => {
      const superAdmin = await createSuperAdmin();
      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: superAdmin.email,
        password: 'SuperAdmin@12345678',
      });

      // Initially 0 stations
      const initDash = await agent.get('/api/v1/super-admin/dashboard');
      expect(initDash.status).to.equal(200);
      expect(initDash.body.data.overview.totalPetrolPumps).to.equal(0);
      expect(initDash.body.data.overview.activePumps).to.equal(0);
      expect(initDash.body.data.overview.pendingApprovals).to.equal(0);

      // Station owner registers
      const regRes = await request(app)
        .post('/api/v1/auth/register/admin')
        .send({
          name: 'Shahid Khan',
          email: 'shahid@pumpstation.pk',
          password: 'Password@123',
          pumpName: 'Shahid Petroleum Services',
          city: 'Faisalabad',
        });
      expect(regRes.status).to.equal(201);
      const pumpId = regRes.body.data.pump._id;

      // Super Admin dashboard reflects 1 total pump, 1 pending approval, 0 active
      const pendingDash = await agent.get('/api/v1/super-admin/dashboard');
      expect(pendingDash.status).to.equal(200);
      expect(pendingDash.body.data.overview.totalPetrolPumps).to.equal(1);
      expect(pendingDash.body.data.overview.pendingApprovals).to.equal(1);
      expect(pendingDash.body.data.overview.activePumps).to.equal(0);
      expect(pendingDash.body.data.pendingPumps).to.have.lengthOf(1);
      expect(pendingDash.body.data.pendingPumps[0]._id.toString()).to.equal(pumpId.toString());

      // Super Admin approves the station
      const approveRes = await agent
        .patch(`/api/v1/super-admin/petrol-pumps/${pumpId}/approve`)
        .send();
      expect(approveRes.status).to.equal(200);

      // Dashboard now reflects 1 total pump, 0 pending, 1 active station!
      const approvedDash = await agent.get('/api/v1/super-admin/dashboard');
      expect(approvedDash.status).to.equal(200);
      expect(approvedDash.body.data.overview.totalPetrolPumps).to.equal(1);
      expect(approvedDash.body.data.overview.pendingApprovals).to.equal(0);
      expect(approvedDash.body.data.overview.activePumps).to.equal(1);
      expect(approvedDash.body.data.pendingPumps).to.have.lengthOf(0);
    });

    it('unauthorized users (e.g. regular admin or customer) cannot access super admin routes', async () => {
      const admin = await createAdmin({ email: 'regadmin@example.com' });
      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await agent.get('/api/v1/super-admin/dashboard');
      expect(res.status).to.equal(403);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Strict Tenant Isolation
  // ─────────────────────────────────────────────────────────────
  describe('Tenant Isolation Between Petrol Pumps', () => {
    let pumpA, adminA, customerA, profileA;
    let pumpB, adminB, customerB, profileB;

    beforeEach(async () => {
      pumpA = await createPetrolPump({ name: 'Pump Alpha' });
      adminA = await createAdmin({
        email: 'adminA@example.com',
        petrolPumpId: pumpA._id,
      });
      pumpA.ownerAdminId = adminA._id;
      await pumpA.save();

      const custDataA = await createCustomer(
        { email: 'custA@example.com' },
        { petrolPumpId: pumpA._id, customerCode: 'CUST-A1' }
      );
      customerA = custDataA.user;
      profileA = custDataA.profile;

      pumpB = await createPetrolPump({ name: 'Pump Beta' });
      adminB = await createAdmin({
        email: 'adminB@example.com',
        petrolPumpId: pumpB._id,
      });
      pumpB.ownerAdminId = adminB._id;
      await pumpB.save();

      const custDataB = await createCustomer(
        { email: 'custB@example.com' },
        { petrolPumpId: pumpB._id, customerCode: 'CUST-B1' }
      );
      customerB = custDataB.user;
      profileB = custDataB.profile;
    });

    it('Admin A cannot view Pump B customer', async () => {
      const agentA = request.agent(app);
      await loginWithCsrf(agentA, {
        email: adminA.email,
        password: 'Admin@12345678',
      });

      // Admin A tries to get Customer B by ID
      const res = await agentA.get(`/api/v1/customers/${profileB._id}`);
      expect(res.status).to.equal(403);
    });

    it('Admin A cannot update Pump B customer', async () => {
      const agentA = request.agent(app);
      await loginWithCsrf(agentA, {
        email: adminA.email,
        password: 'Admin@12345678',
      });

      const res = await agentA
        .put(`/api/v1/customers/${profileB._id}`)
        .send({ customerName: 'Hacked Name' });

      expect(res.status).to.equal(403);

      const unchanged = await CustomerPumpAccount.findById(profileB._id);
      expect(unchanged.customerName).to.not.equal('Hacked Name');
    });

    it('Admin A cannot create a transaction for Pump B customer', async () => {
      const agentA = request.agent(app);
      await loginWithCsrf(agentA, {
        email: adminA.email,
        password: 'Admin@12345678',
      });

      const res = await agentA
        .post('/api/v1/transactions')
        .send({
          customerId: profileB._id,
          transactionType: 'fuel_sale',
          fuelType: 'pmg',
          fuelQuantity: 10,
          rate: 100,
        });

      expect(res.status).to.equal(403);
    });

    it('Admin A cannot download Pump B customer statement report', async () => {
      const agentA = request.agent(app);
      await loginWithCsrf(agentA, {
        email: adminA.email,
        password: 'Admin@12345678',
      });

      const res = await agentA
        .get('/api/v1/reports/export/admin-statement-excel')
        .query({ customerId: String(profileB._id) });
      expect(res.status).to.equal(403);
    });

    it('customer code is uniquely scoped per petrol pump (same code allowed across different pumps)', async () => {
      // Pump A already has 'CUST-A1'.
      // Creating another account with 'CUST-A1' in Pump B should succeed.
      const accountPumpB = await CustomerPumpAccount.create({
        petrolPumpId: pumpB._id,
        customerCode: 'CUST-A1',
        customerName: 'Different Customer Same Code',
        phone: '03009999999',
      });
      expect(accountPumpB).to.exist;
      expect(accountPumpB.customerCode).to.equal('CUST-A1');

      // But creating duplicate in Pump A should throw duplicate key error
      try {
        await CustomerPumpAccount.create({
          petrolPumpId: pumpA._id,
          customerCode: 'CUST-A1',
          customerName: 'Duplicate in Pump A',
          phone: '03008888888',
        });
        expect.fail('Should fail with duplicate key error');
      } catch (err) {
        expect(err.code).to.equal(11000);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Customer Identity & Multi-Pump Account Linking
  // ─────────────────────────────────────────────────────────────
  describe('Global Customer Identity & Multi-Pump Linking', () => {
    let pumpA, pumpB, adminA, adminB;
    let customerUser;

    beforeEach(async () => {
      pumpA = await createPetrolPump({ name: 'Lahore Pump' });
      adminA = await createAdmin({ email: 'adminLahore@example.com', petrolPumpId: pumpA._id });

      pumpB = await createPetrolPump({ name: 'Karachi Pump' });
      adminB = await createAdmin({ email: 'adminKarachi@example.com', petrolPumpId: pumpB._id });

      // Customer registers a global account
      const { user } = await createCustomer(
        {
          name: 'Ahmed Khan',
          email: 'ahmed@example.com',
          phone: '03001112233',
          password: 'Password@123',
        },
        {},
        { createProfile: false }
      );
      customerUser = user;
    });

    it('customer can register via public endpoint', async () => {
      const { token, cookie } = await getCSRFToken();
      const res = await request(app)
        .post('/api/v1/auth/register/customer')
        .set('X-XSRF-TOKEN', token || '')
        .set('Cookie', cookie || '')
        .send({
          name: 'Bilal Customer',
          email: 'bilal@example.com',
          phone: '03214445566',
          password: 'Password@123',
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.role).to.equal('customer');
    });

    it('admin creates unlinked customer account; customer links it using phone verification', async () => {
      // 1. Admin A creates unlinked account for Ahmed Khan
      const accountA = await CustomerPumpAccount.create({
        petrolPumpId: pumpA._id,
        customerCode: 'AK-100',
        customerName: 'Ahmed Traders',
        phone: '03001112233',
        currentBalance: 5000,
        creditLimit: 50000,
        createdBy: adminA._id,
      });

      // 2. Customer logs in
      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: customerUser.email,
        password: 'Password@123',
      });

      // 3. Customer submits link request to the pump account (starts pending)
      const linkRes = await agent
        .post('/api/v1/customer/pumps/link')
        .send({
          petrolPumpId: pumpA._id,
          customerCode: 'AK-100',
          phone: '03001112233',
        });

      expect(linkRes.status).to.equal(201);
      expect(linkRes.body.success).to.be.true;
      expect(linkRes.body.data.status).to.equal('pending');
      const requestId = linkRes.body.data._id;

      // 4. Station Admin A reviews and approves the connection request
      const adminAgent = request.agent(app);
      await loginWithCsrf(adminAgent, { email: adminA.email, password: 'Admin@12345678' });
      const approveRes = await adminAgent
        .patch(`/api/v1/admin/customer-links/${requestId}/approve`)
        .send({});
      expect(approveRes.status).to.equal(200);

      // 5. Customer verifies account now appears in linked pumps list
      const listRes = await agent.get('/api/v1/customer/pumps/my-accounts');
      expect(listRes.status).to.equal(200);
      expect(listRes.body.data.length).to.equal(1);
      expect(listRes.body.data[0].customerCode).to.equal('AK-100');
    });

    it('customer cannot link non-existent customer code at that pump', async () => {
      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: customerUser.email,
        password: 'Password@123',
      });

      // Customer tries to link with non-existent code
      const linkRes = await agent
        .post('/api/v1/customer/pumps/link')
        .send({
          petrolPumpId: pumpA._id,
          customerCode: 'NON-EXISTENT-CODE',
          phone: customerUser.phone,
        });

      expect(linkRes.status).to.equal(404);
      expect(linkRes.body.message).to.match(/no matching account found/i);
    });

    it('customer can link accounts from multiple distinct petrol pumps and view separate dashboards', async () => {
      // Pump A account
      const accountA = await CustomerPumpAccount.create({
        petrolPumpId: pumpA._id,
        customerUserId: customerUser._id,
        userId: customerUser._id,
        customerCode: 'LHR-001',
        customerName: 'Ahmed (Lahore)',
        phone: customerUser.phone,
        currentBalance: 12000,
        createdBy: adminA._id,
      });

      // Pump B account
      const accountB = await CustomerPumpAccount.create({
        petrolPumpId: pumpB._id,
        customerUserId: customerUser._id,
        userId: customerUser._id,
        customerCode: 'KHI-002',
        customerName: 'Ahmed (Karachi)',
        phone: customerUser.phone,
        currentBalance: 25000,
        createdBy: adminB._id,
      });

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: customerUser.email,
        password: 'Password@123',
      });

      // Verify list shows both pumps
      const listRes = await agent.get('/api/v1/customer/pumps/my-accounts');
      expect(listRes.status).to.equal(200);
      expect(listRes.body.data.length).to.equal(2);

      // Verify customer can query Pump A dashboard
      const dashARes = await agent.get(`/api/v1/customer/pumps/${accountA._id}/dashboard`);
      expect(dashARes.status).to.equal(200);
      expect(dashARes.body.data.account.currentBalance).to.equal(12000);
      expect(dashARes.body.data.pump.name).to.equal('Lahore Pump');

      // Verify customer can query Pump B dashboard
      const dashBRes = await agent.get(`/api/v1/customer/pumps/${accountB._id}/dashboard`);
      expect(dashBRes.status).to.equal(200);
      expect(dashBRes.body.data.account.currentBalance).to.equal(25000);
      expect(dashBRes.body.data.pump.name).to.equal('Karachi Pump');
    });

    it('customer cannot access another customers pump account dashboard', async () => {
      // Create another customer's account in Pump A
      const otherUser = await User.create({
        name: 'Other Person',
        email: 'other@example.com',
        phone: '03007778899',
        password: 'Password@123',
        role: 'customer',
      });
      const otherAccount = await CustomerPumpAccount.create({
        petrolPumpId: pumpA._id,
        customerUserId: otherUser._id,
        customerCode: 'OTHER-99',
        customerName: 'Other Person',
        phone: otherUser.phone,
        createdBy: adminA._id,
      });

      // Login as customerUser
      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: customerUser.email,
        password: 'Password@123',
      });

      // Try to access other account
      const res = await agent.get(`/api/v1/customer/pumps/${otherAccount._id}/dashboard`);
      expect(res.status).to.equal(403);
    });
  });
});
