'use strict';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeRecoveryKey = (value) => String(value || '').trim().toUpperCase();
const normalizePassword = (value) => String(value ?? '');

const recoverAdminSchema = {
  validate(input) {
    const value = {
      email: normalizeEmail(input.email),
      recoveryKey: normalizeRecoveryKey(input.recoveryKey),
      newPassword: normalizePassword(input.newPassword),
    };

    const errors = [];

    if (!value.email) {
      errors.push({ path: ['email'], message: 'email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
      errors.push({ path: ['email'], message: 'email must be a valid email address' });
    }

    if (!value.recoveryKey) {
      errors.push({ path: ['recoveryKey'], message: 'recoveryKey is required' });
    } else {
      if (value.recoveryKey.length < 10) {
        errors.push({ path: ['recoveryKey'], message: 'recoveryKey must be at least 10 characters' });
      }
      if (value.recoveryKey.length > 64) {
        errors.push({ path: ['recoveryKey'], message: 'recoveryKey must be at most 64 characters' });
      }
    }

    if (!value.newPassword) {
      errors.push({ path: ['newPassword'], message: 'newPassword is required' });
    } else {
      if (value.newPassword.length < 8) {
        errors.push({ path: ['newPassword'], message: 'newPassword must be at least 8 characters' });
      }
      if (value.newPassword.length > 128) {
        errors.push({ path: ['newPassword'], message: 'newPassword must be at most 128 characters' });
      }
    }

    if (errors.length) {
      return { error: { details: errors } };
    }

    return { value };
  },
};

const adminChangePasswordSchema = {
  validate(input) {
    const value = {
      oldPassword: normalizePassword(input.oldPassword),
      newPassword: normalizePassword(input.newPassword),
      confirmPassword: normalizePassword(input.confirmPassword),
    };

    const errors = [];

    if (!value.oldPassword) {
      errors.push({ path: ['oldPassword'], message: 'oldPassword is required' });
    } else {
      if (value.oldPassword.length < 8) {
        errors.push({ path: ['oldPassword'], message: 'oldPassword must be at least 8 characters' });
      }
      if (value.oldPassword.length > 128) {
        errors.push({ path: ['oldPassword'], message: 'oldPassword must be at most 128 characters' });
      }
    }

    if (!value.newPassword) {
      errors.push({ path: ['newPassword'], message: 'newPassword is required' });
    } else {
      if (value.newPassword.length < 8) {
        errors.push({ path: ['newPassword'], message: 'newPassword must be at least 8 characters' });
      }
      if (value.newPassword.length > 128) {
        errors.push({ path: ['newPassword'], message: 'newPassword must be at most 128 characters' });
      }
    }

    if (!value.confirmPassword) {
      errors.push({ path: ['confirmPassword'], message: 'confirmPassword is required' });
    } else {
      if (value.confirmPassword.length < 8) {
        errors.push({ path: ['confirmPassword'], message: 'confirmPassword must be at least 8 characters' });
      }
      if (value.confirmPassword.length > 128) {
        errors.push({ path: ['confirmPassword'], message: 'confirmPassword must be at most 128 characters' });
      }
    }

    if (value.newPassword && value.confirmPassword && value.newPassword !== value.confirmPassword) {
      errors.push({ path: ['confirmPassword'], message: 'newPassword and confirmPassword must match' });
    }

    if (errors.length) {
      return { error: { details: errors } };
    }

    return { value };
  },
};

const adminLoginSchema = {
  validate(input) {
    const value = {
      email: normalizeEmail(input.email),
      password: normalizePassword(input.password),
    };

    const errors = [];

    if (!value.email) {
      errors.push({ path: ['email'], message: 'email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
      errors.push({ path: ['email'], message: 'email must be a valid email address' });
    }

    if (!value.password) {
      errors.push({ path: ['password'], message: 'password is required' });
    } else if (value.password.length < 8) {
      errors.push({ path: ['password'], message: 'password must be at least 8 characters' });
    }

    if (errors.length) {
      return { error: { details: errors } };
    }

    return { value };
  },
};

const customerLoginSchema = {
  validate(input) {
    const value = {
      customerCode: String(input.customerCode || '').trim().toUpperCase(),
      password: normalizePassword(input.password),
    };

    const errors = [];

    if (!value.customerCode) {
      errors.push({ path: ['customerCode'], message: 'customerCode is required' });
    }

    if (!value.password) {
      errors.push({ path: ['password'], message: 'password is required' });
    } else if (value.password.length < 8) {
      errors.push({ path: ['password'], message: 'password must be at least 8 characters' });
    }

    if (errors.length) {
      return { error: { details: errors } };
    }

    return { value };
  },
};

module.exports = { recoverAdminSchema, adminChangePasswordSchema, adminLoginSchema, customerLoginSchema };