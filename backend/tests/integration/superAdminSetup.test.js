'use strict';
/**
 * Super Admin Setup & Bootstrap Integration Tests
 * 
 * Verifies:
 * - setup-status returns setupRequired: true when no Super Admin exists
 * - setup-status does not expose sensitive data
 * - missing SUPER_ADMIN_EMAIL configuration fails safely
 * - unauthorized email cannot initialize Super Admin (403 generic response)
 * - configured email initializes Super Admin with role: 'super_admin'
 * - client cannot override role
 * - setup-status returns setupRequired: false after setup
 * - second setup attempt is rejected (one-time setup boundary)
 * - concurrent setup attempts do not create duplicate accounts
 * - Super Admin can login through normal /api/v1/auth/login
 * - unauthenticated request to /super-admin API is rejected (401)
 * - admin cannot access /super-admin API (403)
 * - customer cannot access /super-admin API (403)
 * - Super Admin can access /super-admin API (200)
 * - customer registration cannot assign role: 'super_admin'
 * - admin registration cannot assign role: 'super_admin'
 */

const { expect } = require('chai');
const request = require('supertest');
const app = require('../../src/server');
const config = require('../../src/config');
const User = require('../../src/models/User');
const { connectTestDB, clearDB, closeDB } = require('../helpers/db');
const { createAdmin, createCustomer } = require('../fixtures/factories');

describe('Super Admin Bootstrap & Setup Integration Tests', function () {
  this.timeout(25000);

  const testSuperAdminEmail = 'superadmin@petrolsystem.local';

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SUPER_ADMIN_EMAIL = testSuperAdminEmail;
    config.superAdminEmail = testSuperAdminEmail.toLowerCase().trim();
    await connectTestDB();
  });

  beforeEach(async () => {
    config.superAdminEmail = testSuperAdminEmail.toLowerCase().trim();
    process.env.SUPER_ADMIN_EMAIL = testSuperAdminEmail;
    await clearDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  after(async () => {
    await clearDB();
    await closeDB();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Setup Status Endpoint
  // ─────────────────────────────────────────────────────────────
  describe('GET /api/v1/auth/super-admin/setup-status', () => {
    it('should return setupRequired: true when no super_admin exists', async () => {
      const res = await request(app)
        .get('/api/v1/auth/super-admin/setup-status');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.data).to.have.property('setupRequired', true);
      // Ensure no sensitive fields are returned
      expect(res.body.data).to.not.have.property('email');
      expect(res.body.data).to.not.have.property('id');
      expect(res.body.data).to.not.have.property('password');
    });

    it('should return setupRequired: false after a super_admin is created', async () => {
      await User.create({
        name: 'Initial Super Admin',
        email: testSuperAdminEmail,
        password: 'SuperSecurePassword@123',
        role: 'super_admin',
        status: 'approved',
        isActive: true,
      });

      const res = await request(app)
        .get('/api/v1/auth/super-admin/setup-status');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.data).to.have.property('setupRequired', false);
      expect(res.body.data).to.not.have.property('email');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Setup Super Admin Endpoint
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/super-admin/setup', () => {
    it('should fail safely if SUPER_ADMIN_EMAIL is missing from config', async () => {
      config.superAdminEmail = '';
      delete process.env.SUPER_ADMIN_EMAIL;

      const res = await request(app)
        .post('/api/v1/auth/super-admin/setup')
        .send({
          name: 'Super Admin',
          email: testSuperAdminEmail,
          password: 'SuperSecurePassword@123',
        });

      expect(res.status).to.equal(500);
      expect(res.body).to.have.property('success', false);
      expect(res.body.message).to.match(/not configured/i);
    });

    it('should reject setup request with unauthorized email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/super-admin/setup')
        .send({
          name: 'Attacker',
          email: 'unauthorized@example.com',
          password: 'SuperSecurePassword@123',
        });

      expect(res.status).to.equal(403);
      expect(res.body).to.have.property('success', false);
      expect(res.body.message).to.equal('This account is not authorized for Super Admin setup.');
      // Verify no user was created
      const count = await User.countDocuments();
      expect(count).to.equal(0);
    });

    it('should reject setup with password shorter than required length', async () => {
      const res = await request(app)
        .post('/api/v1/auth/super-admin/setup')
        .send({
          name: 'Super Admin',
          email: testSuperAdminEmail,
          password: 'short',
        });

      expect(res.status).to.equal(422);
      expect(res.body).to.have.property('success', false);
    });

    it('should successfully create Super Admin with configured email (case-insensitive)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/super-admin/setup')
        .send({
          name: 'Principal Super Admin',
          email: '  SuPeRaDmIn@PetrolSystem.Local  ',
          password: 'SuperSecurePassword@123',
        });

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('success', true);
      expect(res.body.data).to.have.property('role', 'super_admin');
      expect(res.body.data).to.have.property('email', testSuperAdminEmail);
      expect(res.body.data).to.not.have.property('password');

      // Verify DB record
      const dbUser = await User.findOne({ role: 'super_admin' }).select('+password');
      expect(dbUser).to.exist;
      expect(dbUser.email).to.equal(testSuperAdminEmail);
      expect(dbUser.role).to.equal('super_admin');
      expect(dbUser.status).to.equal('approved');
      expect(dbUser.isActive).to.be.true;
      // Password must be hashed (bcrypt starts with $2a$ or $2b$)
      expect(dbUser.password).to.match(/^\$2[ab]\$/);
      expect(dbUser.password).to.not.equal('SuperSecurePassword@123');
    });

    it('should ignore client attempt to override role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/super-admin/setup')
        .send({
          name: 'Super Admin',
          email: testSuperAdminEmail,
          password: 'SuperSecurePassword@123',
          role: 'custom_role_escalation',
        });

      expect(res.status).to.equal(201);
      expect(res.body.data.role).to.equal('super_admin');

      const dbUser = await User.findOne({ email: testSuperAdminEmail });
      expect(dbUser.role).to.equal('super_admin');
    });

    it('should permanently reject second setup attempt once Super Admin exists', async () => {
      // First setup
      const firstRes = await request(app)
        .post('/api/v1/auth/super-admin/setup')
        .send({
          name: 'Super Admin',
          email: testSuperAdminEmail,
          password: 'SuperSecurePassword@123',
        });
      expect(firstRes.status).to.equal(201);

      // Second setup attempt
      const secondRes = await request(app)
        .post('/api/v1/auth/super-admin/setup')
        .send({
          name: 'Second Super Admin',
          email: testSuperAdminEmail,
          password: 'AnotherPassword@123',
        });

      expect(secondRes.status).to.equal(403);
      expect(secondRes.body).to.have.property('success', false);
      expect(secondRes.body.message).to.equal('Super Admin setup is not available.');

      // Verify only 1 super_admin exists in database
      const count = await User.countDocuments({ role: 'super_admin' });
      expect(count).to.equal(1);
    });

    it('should prevent race condition / concurrent setup attempts from creating two Super Admins', async () => {
      const promises = [
        request(app).post('/api/v1/auth/super-admin/setup').send({
          name: 'Super Admin A',
          email: testSuperAdminEmail,
          password: 'PasswordA@123',
        }),
        request(app).post('/api/v1/auth/super-admin/setup').send({
          name: 'Super Admin B',
          email: testSuperAdminEmail,
          password: 'PasswordB@123',
        }),
      ];

      const results = await Promise.all(promises);
      const successful = results.filter((r) => r.status === 201);
      const rejected = results.filter((r) => r.status === 403 || r.status === 409);

      expect(successful.length).to.equal(1);
      expect(rejected.length).to.equal(1);

      const count = await User.countDocuments({ role: 'super_admin' });
      expect(count).to.equal(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Normal Login & Route Protection
  // ─────────────────────────────────────────────────────────────
  describe('Super Admin Login & Role Protection', () => {
    beforeEach(async () => {
      // Setup the Super Admin first
      await request(app)
        .post('/api/v1/auth/super-admin/setup')
        .send({
          name: 'Governance Lead',
          email: testSuperAdminEmail,
          password: 'SuperSecurePassword@123',
        });
    });

    it('should authenticate Super Admin via POST /api/v1/auth/login and return JWT cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testSuperAdminEmail,
          password: 'SuperSecurePassword@123',
        });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.data).to.have.property('role', 'super_admin');
      expect(res.body.data).to.have.property('email', testSuperAdminEmail);

      const cookies = res.headers['set-cookie'];
      expect(cookies).to.be.an('array');
      expect(cookies.some((c) => c.includes('accessToken='))).to.be.true;
    });

    it('should reject unauthenticated request to Super Admin protected API', async () => {
      const res = await request(app).get('/api/v1/super-admin/dashboard');
      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('success', false);
    });

    it('should reject admin attempting to access Super Admin protected API', async () => {
      // Create and login regular admin
      await createAdmin({
        email: 'stationadmin@pump.com',
        password: 'AdminPassword@123',
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'stationadmin@pump.com',
          password: 'AdminPassword@123',
        });

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/v1/super-admin/dashboard')
        .set('Cookie', cookies);

      expect(res.status).to.equal(403);
      expect(res.body.message).to.match(/do not have permission/i);
    });

    it('should reject customer attempting to access Super Admin protected API', async () => {
      await createCustomer({
        email: 'customer@buyer.com',
        password: 'CustPassword@123',
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer@buyer.com',
          password: 'CustPassword@123',
        });

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/v1/super-admin/dashboard')
        .set('Cookie', cookies);

      expect(res.status).to.equal(403);
    });

    it('should allow authenticated Super Admin to access Super Admin protected API', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testSuperAdminEmail,
          password: 'SuperSecurePassword@123',
        });

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/v1/super-admin/dashboard')
        .set('Cookie', cookies);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.data).to.have.property('stats');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Prevention of Privilege Escalation on Public Registration
  // ─────────────────────────────────────────────────────────────
  describe('Privilege Escalation Prevention on Registration Endpoints', () => {
    it('customer registration cannot assign super_admin even if provided in body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/customer')
        .send({
          name: 'Sneaky User',
          email: 'sneaky@customer.com',
          password: 'Password@123',
          role: 'super_admin',
        });

      expect(res.status).to.equal(201);
      expect(res.body.data.role).to.equal('customer');

      const user = await User.findOne({ email: 'sneaky@customer.com' });
      expect(user.role).to.equal('customer');
    });

    it('admin registration cannot assign super_admin even if provided in body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/admin')
        .send({
          name: 'Pump Admin User',
          email: 'pumpadmin@station.com',
          password: 'Password@123',
          pumpName: 'City Station',
          role: 'super_admin',
        });

      expect(res.status).to.equal(201);
      expect(res.body.data.user.role).to.equal('admin');

      const user = await User.findOne({ email: 'pumpadmin@station.com' });
      expect(user.role).to.equal('admin');
    });
  });
});
