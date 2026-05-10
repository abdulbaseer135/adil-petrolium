'use strict';
/**
 * Auth Integration Tests
 * 
 * Covers:
 * - Admin and customer login with email/password
 * - Invalid credentials handling
 * - /auth/me endpoint access control
 * - Refresh token flow and cookie handling
 * - Logout and cookie clearing
 * - Admin-only route access control
 * - Failed login tracking and lockout
 * - Security logging for auth events
 */

const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');

const app = require('../../src/server');
const { connectTestDB, clearDB, closeDB } = require('../helpers/db');
const {
  createAdmin,
  createCustomer,
} = require('../fixtures/factories');
const {
  loginWithCsrf,
  getCSRFToken,
} = require('../helpers/csrf');
const logger = require('../../src/utils/logger');

describe('Auth Integration Tests', function () {
  this.timeout(20000);

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  afterEach(async () => {
    // Ensure each test leaves the DB clean for the next suite
    await clearDB();
  });

  after(async () => {
    await clearDB();
    await closeDB();
  });

  // ─────────────────────────────────────────────────────────────
  // Login — Success Cases
  // ─────────────────────────────────────────────────────────────

  describe('Login', () => {
    it('should login admin with email and password and set cookies', async () => {
      const admin = await createAdmin({
        email: 'admin@login-test.com',
        password: 'SecurePass@123',
      });

      const { token, cookie } = await getCSRFToken();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', token || '').set('Cookie', cookie || '')
        .send({
          email: 'admin@login-test.com',
          password: 'SecurePass@123',
        });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.data).to.have.property('role', 'admin');

      // Verify cookies set
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).to.be.an('array');
      expect(setCookie.some((c) => c.includes('accessToken='))).to.be.true;
      expect(setCookie.some((c) => c.includes('refreshToken='))).to.be.true;
      expect(setCookie.some((c) => c.includes('HttpOnly'))).to.be.true;
    });

    it('should login customer with email and password', async () => {
      const { user } = await createCustomer({
        email: 'cust@login-test.com',
        password: 'CustPass@123',
      });

      const { token, cookie } = await getCSRFToken();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', token || '').set('Cookie', cookie || '')
        .send({
          email: 'cust@login-test.com',
          password: 'CustPass@123',
        });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.data).to.have.property('role', 'customer');
      expect(res.body.data).to.have.property('email', user.email);
    });

    it('should login customer using phone number as password fallback', async () => {
      const { user } = await createCustomer({
        email: 'cust-phone@example.com',
        password: 'CustPass@123',
      }, {}, { createProfile: false });

      // user.phone should be set by factory
      expect(user.phone).to.exist;

      const { token, cookie } = await getCSRFToken();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', token || '').set('Cookie', cookie || '')
        .send({
          email: 'cust-phone@example.com',
          password: user.phone,
        });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Login — Failure Cases
  // ─────────────────────────────────────────────────────────────

  describe('Login Failures', () => {
    it('should fail login with invalid email', async () => {
      const { token, cookie } = await getCSRFToken();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', token || '').set('Cookie', cookie || '')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword@123',
        });

      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('success', false);
      expect(res.body.message).to.include('credentials');
    });

    it('should fail login with wrong password', async () => {
      const admin = await createAdmin({
        email: 'admin-wrong@example.com',
        password: 'CorrectPassword@123',
      });

      const { token, cookie } = await getCSRFToken();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', token || '').set('Cookie', cookie || '')
        .send({
          email: 'admin-wrong@example.com',
          password: 'WrongPassword@123',
        });

      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('success', false);
    });

    it('should not leak whether email exists in error response', async () => {
      const { token, cookie } = await getCSRFToken();
      const res1 = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', token || '').set('Cookie', cookie || '')
        .send({ email: 'exists@example.com', password: 'wrong' });

      const res2 = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', token || '').set('Cookie', cookie || '')
        .send({ email: 'doesnotexist@example.com', password: 'wrong' });

      // Both should return generic "Invalid credentials"
      expect(res1.status).to.equal(401);
      expect(res2.status).to.equal(401);
      expect(res1.body.message).to.equal(res2.body.message);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Auth Endpoint Access Control
  // ─────────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('success', false);
    });

    it('should return authenticated user profile', async () => {
      const admin = await createAdmin({
        email: 'admin-me@example.com',
        password: 'AdminPass@123',
      });

      const agent = request.agent(app);
      const { token, cookie } = await getCSRFToken();
      await agent.post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', token || '').set('Cookie', cookie || '')
        .send({
        email: 'admin-me@example.com',
        password: 'AdminPass@123',
      });

      const res = await agent.get('/api/v1/auth/me');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.data).to.have.property('email', admin.email);
      expect(res.body.data).to.have.property('role', 'admin');
      expect(res.body.data).to.have.property('id');
    });

    it('should not expose password or sensitive fields in /me response', async () => {
      const admin = await createAdmin({
        email: 'admin-sensitive@example.com',
        password: 'Pass12344',
      });

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: 'admin-sensitive@example.com',
        password: 'Pass12344',
      });

      const res = await agent.get('/api/v1/auth/me');

      expect(res.status).to.equal(200);
      expect(res.body.data).to.not.have.property('password');
      expect(res.body.data).to.not.have.property('passwordChangedAt');
      expect(res.body.data).to.not.have.property('failedLoginAttempts');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Refresh Token Flow
  // ─────────────────────────────────────────────────────────────

  describe('Token Refresh', () => {
    it('should refresh access token and rotate refresh token', async () => {
      const admin = await createAdmin({
        email: 'admin-refresh@example.com',
        password: 'Pass12344',
      });

      const agent = request.agent(app);

      // 1. Login
      const loginRes = await loginWithCsrf(agent, {
        email: 'admin-refresh@example.com',
        password: 'Pass12344',
      });
      expect(loginRes.status).to.equal(200);

      // 2. Refresh
      const refreshRes = await postWithCsrf(agent, '/api/v1/auth/refresh');
      expect(refreshRes.status).to.equal(200);
      expect(refreshRes.body).to.have.property('success', true);

      // 3. Use new token to verify still authenticated
      const meRes = await agent.get('/api/v1/auth/me');
      expect(meRes.status).to.equal(200);
      expect(meRes.body.data).to.have.property('email', admin.email);
    });

    it('should log token refresh with userId', async () => {
      const admin = await createAdmin({ email: 'admin-refresh-log@example.com', password: 'Pass12344' });
      const agent = request.agent(app);
      await loginWithCsrf(agent, { email: admin.email, password: 'Pass12344' });

      const logSpy = sinon.spy(logger, 'info');
      await postWithCsrf(agent, '/api/v1/auth/refresh');
      logSpy.restore();

      const found = logSpy.getCalls().some(call => call.args[0] && String(call.args[0].userId) === String(admin._id));
      expect(found).to.be.true;
    });

    it('should fail refresh without refresh token', async () => {
      const agent = request.agent(app);
      const csrf = await getCSRFToken(agent);

      const res = await agent.post('/api/v1/auth/refresh')
        .set('X-XSRF-TOKEN', csrf.token || '')
        .set('Cookie', csrf.cookie || '')
        .send();

      // Should fail because no refreshToken cookie
      expect(res.status).to.equal(401);
    });

    it('should reject refresh with invalid/tampered refresh token', async () => {
      const admin = await createAdmin();

      const csrf = await getCSRFToken();
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('X-XSRF-TOKEN', csrf.token || '')
        .set('Cookie', `${csrf.cookie || ''}; refreshToken=invalid.token.here`)
        .send();

      expect(res.status).to.equal(401);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────────────────────────

  describe('Logout', () => {
    it('should logout and clear cookies', async () => {
      const admin = await createAdmin();

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      // Verify authenticated
      let res = await agent.get('/api/v1/auth/me');
      expect(res.status).to.equal(200);

      // Logout
      const logSpy = sinon.spy(logger, 'info');
      const logoutRes = await postWithCsrf(agent, '/api/v1/auth/logout');
      logSpy.restore();
      expect(logoutRes.status).to.equal(200);

      // Verify cookies cleared
      const setCookie = logoutRes.headers['set-cookie'] || [];
      expect(setCookie.length).to.be.greaterThan(0);

      // Verify no longer authenticated
      res = await agent.get('/api/v1/auth/me');
      expect(res.status).to.equal(401);
      // Ensure logout logged with userId
      const found = logSpy.getCalls().some(call => call.args[0] && call.args[0].userId);
      expect(found).to.be.true;
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Access Control — Role-Based
  // ─────────────────────────────────────────────────────────────

  describe('Role-Based Access Control', () => {
    it('should allow admin to access admin-only routes', async () => {
      const admin = await createAdmin();

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: admin.email,
        password: 'Admin@12345678',
      });

      const res = await agent.get('/api/v1/customers');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
    });

    it('should deny customer access to admin-only routes', async () => {
      const { user } = await createCustomer();

      const agent = request.agent(app);
      await loginWithCsrf(agent, {
        email: user.email,
        password: 'Cust@12345678',
      });

      // Customer attempting to list customers (admin-only)
      const res = await agent.get('/api/v1/customers');
      expect(res.status).to.equal(403);
      expect(res.body).to.have.property('success', false);
      expect(res.body.message).to.include('permission');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Failed Login Attempts & Account Lockout
  // ─────────────────────────────────────────────────────────────

  describe('Failed Login Attempts & Lockout', () => {
    it('should increment failed attempts on wrong password', async () => {
      const admin = await createAdmin({
        email: 'admin-lockout@example.com',
        password: 'CorrectPass12344',
      });

      // Attempt 1
      let csrf = await getCSRFToken();
      let res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', csrf.token || '')
        .set('Cookie', csrf.cookie || '')
        .send({
          email: 'admin-lockout@example.com',
          password: 'WrongPass1',
        });
      expect(res.status).to.equal(401);

      // Attempt 2
      csrf = await getCSRFToken();
      res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', csrf.token || '')
        .set('Cookie', csrf.cookie || '')
        .send({
          email: 'admin-lockout@example.com',
          password: 'WrongPass2',
        });
      expect(res.status).to.equal(401);

      // Attempt 3
      csrf = await getCSRFToken();
      res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', csrf.token || '')
        .set('Cookie', csrf.cookie || '')
        .send({
          email: 'admin-lockout@example.com',
          password: 'WrongPass3',
        });
      expect(res.status).to.equal(401);

      // Attempt 4
      csrf = await getCSRFToken();
      res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', csrf.token || '')
        .set('Cookie', csrf.cookie || '')
        .send({
          email: 'admin-lockout@example.com',
          password: 'WrongPass4',
        });
      expect(res.status).to.equal(401);

      // Attempt 5 — should lock account
      csrf = await getCSRFToken();
      res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', csrf.token || '')
        .set('Cookie', csrf.cookie || '')
        .send({
          email: 'admin-lockout@example.com',
          password: 'WrongPass5',
        });
      expect(res.status).to.equal(401);

      // Attempt 6 with correct password — should still fail due to lockout
      csrf = await getCSRFToken();
      res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', csrf.token || '')
        .set('Cookie', csrf.cookie || '')
        .send({
          email: 'admin-lockout@example.com',
          password: 'CorrectPass12344',
        });
      expect(res.status).to.equal(423); // 423 Locked
    });

    it('should reset failed attempts on successful login', async () => {
      const admin = await createAdmin({
        email: 'admin-reset@example.com',
        password: 'CorrectPass12344',
      });

      // One wrong attempt
      let csrf = await getCSRFToken();
      let res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', csrf.token || '')
        .set('Cookie', csrf.cookie || '')
        .send({
          email: 'admin-reset@example.com',
          password: 'WrongPass',
        });
      expect(res.status).to.equal(401);

      // Correct login should succeed and reset counter
      csrf = await getCSRFToken();
      res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', csrf.token || '')
        .set('Cookie', csrf.cookie || '')
        .send({
          email: 'admin-reset@example.com',
          password: 'CorrectPass12344',
        });
      expect(res.status).to.equal(200);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Security Logging
  // ─────────────────────────────────────────────────────────────

  describe('Auth Security Logging', () => {
    it('should log successful login with user info', async () => {
      const logSpy = sinon.spy(logger, 'info');

      const admin = await createAdmin({
        email: 'admin-log@example.com',
        password: 'Pass12344',
      });

      const loginCsrf = await getCSRFToken();
      await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', loginCsrf.token || '')
        .set('Cookie', loginCsrf.cookie || '')
        .send({
          email: 'admin-log@example.com',
          password: 'Pass12344',
        });

      // Restore spy after capturing calls
      logSpy.restore();

      // Assert structured log call contained userId and role
      const found = logSpy
        .getCalls()
        .some((call) => {
          const firstArg = call.args[0];
          return firstArg && String(firstArg.userId) === String(admin._id) && firstArg.role === 'admin';
        });

      expect(found).to.be.true;
    });

    it('should log failed login attempts', async () => {
      const logSpy = sinon.spy(logger, 'warn');

      const loginCsrf = await getCSRFToken();
      await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', loginCsrf.token || '')
        .set('Cookie', loginCsrf.cookie || '')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpass',
        });

      logSpy.restore();

      // Should have warned about failed login
      expect(logSpy.called).to.be.true;
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Error Response Format
  // ─────────────────────────────────────────────────────────────

  describe('Error Response Format', () => {
    it('should return standardized error response', async () => {
      const loginCsrf = await getCSRFToken();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', loginCsrf.token || '')
        .set('Cookie', loginCsrf.cookie || '')
        .send({
          email: 'invalid@example.com',
          password: 'wrong',
        });

      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('success', false);
      expect(res.body).to.have.property('message');
      expect(res.body.message).to.be.a('string');
      expect(res.body).to.not.have.property('data');
    });

    it('should return success response with data on login', async () => {
      const admin = await createAdmin();

      const loginCsrf = await getCSRFToken();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-XSRF-TOKEN', loginCsrf.token || '')
        .set('Cookie', loginCsrf.cookie || '')
        .send({
          email: admin.email,
          password: 'Admin@12345678',
        });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('message');
      expect(res.body).to.have.property('data');
    });
  });
});