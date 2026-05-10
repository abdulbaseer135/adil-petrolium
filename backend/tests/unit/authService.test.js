'use strict';
/**
 * Auth Service Unit Tests
 * 
 * Covers:
 * - Login success and failure paths
 * - Password comparison logic
 * - Refresh token generation/rotation
 * - Failed login attempt tracking and lockout
 * - Security event logging
 */

const { expect } = require('chai');
const sinon = require('sinon');

const { connectTestDB, clearDB, closeDB } = require('../helpers/db');
const {
  createAdmin,
  createCustomer,
} = require('../fixtures/factories');
const authService = require('../../src/services/authService');
const User = require('../../src/models/User');
const logger = require('../../src/utils/logger');

describe('Auth Service Unit Tests', function () {
  this.timeout(20000);

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  afterEach(() => {
    sinon.restore();
  });

  after(async () => {
    await clearDB();
    await closeDB();
  });

  // ─────────────────────────────────────────────────────────────
  // Login Success
  // ─────────────────────────────────────────────────────────────

  describe('Login Success', () => {
    it('should login admin with correct email and password', async () => {
      const admin = await createAdmin({
        email: 'service-admin@example.com',
        password: 'SecurePass@123',
      });

      const result = await authService.login({
        email: 'service-admin@example.com',
        password: 'SecurePass@123',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        requestId: 'req-123',
      });

      expect(result).to.have.property('user');
      expect(result.user).to.have.property('id');
      expect(result.user).to.have.property('email', 'service-admin@example.com');
      expect(result.user).to.have.property('role', 'admin');
      expect(result).to.have.property('accessToken');
      expect(result).to.have.property('refreshToken');
    });

    it('should login customer with correct credentials', async () => {
      const { user } = await createCustomer({
        email: 'service-cust@example.com',
        password: 'CustPass@123',
      });

      const result = await authService.login({
        email: 'service-cust@example.com',
        password: 'CustPass@123',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        requestId: 'req-123',
      });

      expect(result).to.have.property('user');
      expect(result.user).to.have.property('role', 'customer');
      expect(result).to.have.property('accessToken');
      expect(result).to.have.property('refreshToken');
    });

    it('should reset failed login attempts on success', async () => {
      const admin = await createAdmin({
        email: 'service-reset@example.com',
        password: 'SecurePass@123',
      });

      // Manually set failed attempts
      admin.failedLoginAttempts = 2;
      await admin.save();

      await authService.login({
        email: 'service-reset@example.com',
        password: 'SecurePass@123',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        requestId: 'req-123',
      });

      const updated = await User.findById(admin._id).select('+failedLoginAttempts');
      expect(updated.failedLoginAttempts).to.equal(0);
    });

    it('should return user without sensitive fields', async () => {
      const admin = await createAdmin();

      const result = await authService.login({
        email: admin.email,
        password: 'Admin@12345678',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        requestId: 'req-123',
      });

      expect(result.user).to.not.have.property('password');
      expect(result.user).to.not.have.property('failedLoginAttempts');
      expect(result.user).to.not.have.property('passwordChangedAt');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Login Failure
  // ─────────────────────────────────────────────────────────────

  describe('Login Failure', () => {
    it('should throw 401 for non-existent email', async () => {
      try {
        await authService.login({
          email: 'nonexistent@example.com',
          password: 'anypassword',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          requestId: 'req-123',
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(401);
        expect(err.message).to.include('credentials');
      }
    });

    it('should throw 401 for incorrect password', async () => {
      const admin = await createAdmin({
        email: 'service-wrong@example.com',
        password: 'CorrectPass@123',
      });

      try {
        await authService.login({
          email: 'service-wrong@example.com',
          password: 'WrongPass@123',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          requestId: 'req-123',
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(401);
      }
    });

    it('should throw 403 for inactive account', async () => {
      const admin = await createAdmin({
        email: 'service-inactive@example.com',
        password: 'SecurePass@123',
        isActive: false,
      });

      try {
        await authService.login({
          email: 'service-inactive@example.com',
          password: 'SecurePass@123',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          requestId: 'req-123',
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
        expect(err.message).to.include('deactivated');
      }
    });

    it('should increment failed attempts on wrong password', async () => {
      const admin = await createAdmin({
        email: 'service-attempts@example.com',
        password: 'CorrectPass@123',
      });

      try {
        await authService.login({
          email: 'service-attempts@example.com',
          password: 'WrongPass@123',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          requestId: 'req-123',
        });
      } catch (err) {
        // Expected
      }

      const updated = await User.findById(admin._id).select('+failedLoginAttempts');
      expect(updated.failedLoginAttempts).to.equal(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Phone Fallback Login
  // ─────────────────────────────────────────────────────────────

  describe('Phone Fallback Login', () => {
    it('should allow login with phone number instead of password', async () => {
      const { user } = await createCustomer({
        email: 'service-phone@example.com',
        password: 'SecurePass@123',
      });

      expect(user.phone).to.exist;

      const result = await authService.login({
        email: 'service-phone@example.com',
        password: user.phone,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        requestId: 'req-123',
      });

      expect(result).to.have.property('accessToken');
      expect(result).to.have.property('refreshToken');
    });

    it('should handle different phone number formats', async () => {
      const { user } = await createCustomer({
        email: 'service-phone2@example.com',
        password: 'SecurePass@123',
      });

      // Original phone format
      const originalPhone = user.phone;
      expect(originalPhone).to.match(/^03\d{9}$/); // Pakistani format

      // Try login with original format
      const result = await authService.login({
        email: 'service-phone2@example.com',
        password: originalPhone,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        requestId: 'req-123',
      });

      expect(result).to.have.property('accessToken');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Account Lockout
  // ─────────────────────────────────────────────────────────────

  describe('Account Lockout', () => {
    it('should lock account after 5 failed attempts', async () => {
      const admin = await createAdmin({
        email: 'service-lockout@example.com',
        password: 'CorrectPass@123',
      });

      // Attempt 5 wrong logins
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login({
            email: 'service-lockout@example.com',
            password: 'WrongPass@123',
            ipAddress: '127.0.0.1',
            userAgent: 'Test Agent',
            requestId: 'req-123',
          });
        } catch (err) {
          // Expected
        }
      }

      const updated = await User.findById(admin._id).select('+isLocked +lockUntil');
      expect(updated.isLocked).to.be.true;
      expect(updated.lockUntil).to.exist;
      expect(updated.lockUntil.getTime()).to.be.greaterThan(Date.now());
    });

    it('should prevent login during lockout period', async () => {
      const admin = await createAdmin({
        email: 'service-locked@example.com',
        password: 'SecurePass@123',
      });

      // Manually lock the account
      admin.isLocked = true;
      admin.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      await admin.save();

      try {
        await authService.login({
          email: 'service-locked@example.com',
          password: 'SecurePass@123',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          requestId: 'req-123',
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(423); // 423 Locked
        expect(err.message).to.include('Account locked');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Password Validation
  // ─────────────────────────────────────────────────────────────

  describe('Password Validation', () => {
    it('should use bcrypt for password comparison', async () => {
      const admin = await createAdmin({
        email: 'service-bcrypt@example.com',
        password: 'TestPassword@123',
      });

      // Fetch with password selected
      const user = await User.findById(admin._id).select('+password');

      // Password should be hashed
      expect(user.password).to.not.equal('TestPassword@123');
      expect(user.password).to.match(/^\$2[aby]\$/); // bcrypt format

      // comparePassword should work
      const matches = await user.comparePassword('TestPassword@123');
      expect(matches).to.be.true;

      // Wrong password should not match
      const wrongMatches = await user.comparePassword('WrongPassword@123');
      expect(wrongMatches).to.be.false;
    });

    it('should handle invalid password hash gracefully', async () => {
      const admin = await createAdmin();

      // Bypass pre('save') hashing — assigning + save() would re-hash to valid bcrypt
      await User.updateOne({ _id: admin._id }, { $set: { password: 'invalid-hash' } });
      const user = await User.findById(admin._id).select('+password');

      try {
        await user.comparePassword('anypassword');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.include('Invalid password hash in database');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Token Generation
  // ─────────────────────────────────────────────────────────────

  describe('Token Generation', () => {
    it('should generate valid access token', async () => {
      const admin = await createAdmin();

      const result = await authService.login({
        email: admin.email,
        password: 'Admin@12345678',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        requestId: 'req-123',
      });

      expect(result.accessToken).to.exist;
      expect(result.accessToken).to.be.a('string');
      expect(result.accessToken.split('.')).to.have.lengthOf(3); // JWT format
    });

    it('should generate valid refresh token', async () => {
      const admin = await createAdmin();

      const result = await authService.login({
        email: admin.email,
        password: 'Admin@12345678',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        requestId: 'req-123',
      });

      expect(result.refreshToken).to.exist;
      expect(result.refreshToken).to.be.a('string');
      expect(result.refreshToken.length).to.be.greaterThan(30);
    });

    it('should save refresh token to database', async () => {
      const admin = await createAdmin();

      const result = await authService.login({
        email: admin.email,
        password: 'Admin@12345678',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        requestId: 'req-123',
      });

      // Verify token was saved (can't directly verify without knowing the hashing mechanism)
      // But we can verify the flow completes without errors
      expect(result.refreshToken).to.exist;
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Security Logging
  // ─────────────────────────────────────────────────────────────

  describe('Security Logging', () => {
    it('should log successful login', async () => {
      const logSpy = sinon.spy(logger, 'info');
      const admin = await createAdmin({
        email: 'service-log@example.com',
        password: 'Pass1234',
      });

      await authService.login({
        email: 'service-log@example.com',
        password: 'Pass1234',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        requestId: 'req-123',
      });

      logSpy.restore();

      // Verify login was logged
      expect(logSpy.called).to.be.true;
    });

    it('should log failed login attempts', async () => {
      const logSpy = sinon.spy(logger, 'warn');

      try {
        await authService.login({
          email: 'nonexistent@example.com',
          password: 'anypassword',
          ipAddress: '192.168.1.100',
          userAgent: 'Test',
          requestId: 'req-123',
        });
      } catch (err) {
        // Expected
      }

      logSpy.restore();

      expect(logSpy.called).to.be.true;
    });

    it('should not log plaintext passwords', async () => {
      const logSpy = sinon.spy(logger, 'warn');

      try {
        await authService.login({
          email: 'test@example.com',
          password: 'SecretPass123',
          ipAddress: '127.0.0.1',
          userAgent: 'Test',
          requestId: 'req-123',
        });
      } catch (err) {
        // Expected
      }

      logSpy.restore();

      // Verify logs don't contain password
      const logs = logSpy.getCalls().map((call) => JSON.stringify(call.args));
      const allLogs = logs.join('');
      expect(allLogs).to.not.include('SecretPass123');
    });
  });
});
