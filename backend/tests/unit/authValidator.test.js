'use strict';
const { expect } = require('chai');
const authValidator = require('../../src/validators/authValidator');

describe('Auth Validator Unit', function () {
  describe('recoverAdminSchema', function () {
    it('validates valid recovery input', () => {
      const input = {
        email: '  ADMIN@EXAMPLE.COM  ',
        recoveryKey: '  validkey123456  ',
        newPassword: 'NewPass@123',
      };
      const result = authValidator.recoverAdminSchema.validate(input);
      expect(result.error).to.not.exist;
      expect(result.value).to.exist;
      expect(result.value.email).to.equal('admin@example.com');
      expect(result.value.recoveryKey).to.equal('VALIDKEY123456');
    });

    it('rejects missing email', () => {
      const input = { email: '', recoveryKey: 'validkey123456', newPassword: 'NewPass@123' };
      const result = authValidator.recoverAdminSchema.validate(input);
      expect(result.error).to.exist;
      expect(result.error.details).to.be.an('array');
      const emailError = result.error.details.find((e) => e.path[0] === 'email');
      expect(emailError).to.exist;
      expect(emailError.message).to.include('required');
    });

    it('rejects invalid email format', () => {
      const input = { email: 'invalid-email', recoveryKey: 'validkey123456', newPassword: 'NewPass@123' };
      const result = authValidator.recoverAdminSchema.validate(input);
      expect(result.error).to.exist;
      const emailError = result.error.details.find((e) => e.path[0] === 'email');
      expect(emailError.message).to.include('valid email address');
    });

    it('rejects recovery key < 10 characters', () => {
      const input = { email: 'admin@example.com', recoveryKey: 'short', newPassword: 'NewPass@123' };
      const result = authValidator.recoverAdminSchema.validate(input);
      expect(result.error).to.exist;
      const keyError = result.error.details.find((e) => e.path[0] === 'recoveryKey');
      expect(keyError.message).to.include('at least 10 characters');
    });

    it('rejects recovery key > 64 characters', () => {
      const input = {
        email: 'admin@example.com',
        recoveryKey: 'a'.repeat(65),
        newPassword: 'NewPass@123',
      };
      const result = authValidator.recoverAdminSchema.validate(input);
      expect(result.error).to.exist;
      const keyError = result.error.details.find((e) => e.path[0] === 'recoveryKey');
      expect(keyError.message).to.include('at most 64 characters');
    });

    it('rejects password < 8 characters', () => {
      const input = { email: 'admin@example.com', recoveryKey: 'validkey123456', newPassword: 'Pass1!' };
      const result = authValidator.recoverAdminSchema.validate(input);
      expect(result.error).to.exist;
      const passError = result.error.details.find((e) => e.path[0] === 'newPassword');
      expect(passError.message).to.include('at least 8 characters');
    });

    it('rejects password > 128 characters', () => {
      const input = {
        email: 'admin@example.com',
        recoveryKey: 'validkey123456',
        newPassword: 'Pass@123' + 'a'.repeat(128),
      };
      const result = authValidator.recoverAdminSchema.validate(input);
      expect(result.error).to.exist;
      const passError = result.error.details.find((e) => e.path[0] === 'newPassword');
      expect(passError.message).to.include('at most 128 characters');
    });

    it('rejects missing recovery key', () => {
      const input = { email: 'admin@example.com', recoveryKey: '', newPassword: 'NewPass@123' };
      const result = authValidator.recoverAdminSchema.validate(input);
      expect(result.error).to.exist;
      const keyError = result.error.details.find((e) => e.path[0] === 'recoveryKey');
      expect(keyError.message).to.include('required');
    });

    it('rejects missing password', () => {
      const input = { email: 'admin@example.com', recoveryKey: 'validkey123456', newPassword: '' };
      const result = authValidator.recoverAdminSchema.validate(input);
      expect(result.error).to.exist;
      const passError = result.error.details.find((e) => e.path[0] === 'newPassword');
      expect(passError.message).to.include('required');
    });
  });

  describe('adminChangePasswordSchema', function () {
    it('validates matching passwords', () => {
      const input = {
        oldPassword: 'OldPass123',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      };
      const result = authValidator.adminChangePasswordSchema.validate(input);
      expect(result.error).to.not.exist;
      expect(result.value).to.exist;
    });

    it('rejects mismatched passwords', () => {
      const input = {
        oldPassword: 'OldPass123',
        newPassword: 'NewPass123',
        confirmPassword: 'DifferentPass123',
      };
      const result = authValidator.adminChangePasswordSchema.validate(input);
      expect(result.error).to.exist;
      const mismatchError = result.error.details.find((e) => e.path[0] === 'confirmPassword');
      expect(mismatchError).to.exist;
    });

    it('rejects old password when blank', () => {
      const input = {
        oldPassword: '',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      };
      const result = authValidator.adminChangePasswordSchema.validate(input);
      expect(result.error).to.exist;
      const oldPassError = result.error.details.find((e) => e.path[0] === 'oldPassword');
      expect(oldPassError.message).to.include('required');
    });

    it('rejects new password < 8 chars', () => {
      const input = {
        oldPassword: 'OldPass@123',
        newPassword: 'New@1',
        confirmPassword: 'New@1',
      };
      const result = authValidator.adminChangePasswordSchema.validate(input);
      expect(result.error).to.exist;
      const newPassError = result.error.details.find((e) => e.path[0] === 'newPassword');
      expect(newPassError.message).to.include('at least 8 characters');
    });
  });

  describe('adminLoginSchema', function () {
    it('validates valid login credentials', () => {
      const input = { email: '  ADMIN@EXAMPLE.COM  ', password: 'Admin@123' };
      const result = authValidator.adminLoginSchema.validate(input);
      expect(result.error).to.not.exist;
      expect(result.value.email).to.equal('admin@example.com');
    });

    it('rejects missing email', () => {
      const input = { email: '', password: 'Admin@123' };
      const result = authValidator.adminLoginSchema.validate(input);
      expect(result.error).to.exist;
      const emailError = result.error.details.find((e) => e.path[0] === 'email');
      expect(emailError.message).to.include('required');
    });

    it('rejects missing password', () => {
      const input = { email: 'admin@example.com', password: '' };
      const result = authValidator.adminLoginSchema.validate(input);
      expect(result.error).to.exist;
      const passError = result.error.details.find((e) => e.path[0] === 'password');
      expect(passError.message).to.include('required');
    });
  });

  describe('customerLoginSchema', function () {
    it('validates valid customer login', () => {
      const input = { customerCode: '  CUST-0001  ', password: 'Pass@123' };
      const result = authValidator.customerLoginSchema.validate(input);
      expect(result.error).to.not.exist;
      expect(result.value.customerCode).to.equal('CUST-0001');
    });

    it('rejects missing customer code', () => {
      const input = { customerCode: '', password: 'Pass@123' };
      const result = authValidator.customerLoginSchema.validate(input);
      expect(result.error).to.exist;
      const codeError = result.error.details.find((e) => e.path[0] === 'customerCode');
      expect(codeError.message).to.include('required');
    });

    it('rejects missing password', () => {
      const input = { customerCode: 'CUST-0001', password: '' };
      const result = authValidator.customerLoginSchema.validate(input);
      expect(result.error).to.exist;
    });
  });
});
