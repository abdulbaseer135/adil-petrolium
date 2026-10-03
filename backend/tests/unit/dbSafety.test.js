'use strict';

const { expect } = require('chai');
const {
  extractDatabaseName,
  isTestDatabaseName,
  assertTestDatabase,
  assertDestructiveOperationAllowed,
  getSafeDbDiagnostics,
} = require('../../src/utils/dbSafety');

describe('Database Safety Utility (Unit Tests)', () => {
  describe('extractDatabaseName()', () => {
    it('extracts db name from standard mongodb URI', () => {
      const db = extractDatabaseName('mongodb://localhost:27017/petro_dealer');
      expect(db).to.equal('petro_dealer');
    });

    it('extracts db name from authenticated URI with options', () => {
      const db = extractDatabaseName('mongodb://user:pass@127.0.0.1:27017/petro_dealer_test?authSource=admin');
      expect(db).to.equal('petro_dealer_test');
    });

    it('extracts db name from mongodb+srv URI', () => {
      const db = extractDatabaseName('mongodb+srv://user:pass@cluster0.abc.mongodb.net/petrol_management_test?retryWrites=true');
      expect(db).to.equal('petrol_management_test');
    });

    it('returns unknown for missing or invalid URI', () => {
      expect(extractDatabaseName('')).to.equal('unknown');
      expect(extractDatabaseName(null)).to.equal('unknown');
      expect(extractDatabaseName('mongodb://localhost:27017')).to.equal('unknown');
    });
  });

  describe('isTestDatabaseName()', () => {
    it('accepts valid test database names', () => {
      expect(isTestDatabaseName('petro_dealer_test')).to.be.true;
      expect(isTestDatabaseName('petrol_management_test')).to.be.true;
      expect(isTestDatabaseName('test_db')).to.be.true;
      expect(isTestDatabaseName('my_test_environment')).to.be.true;
    });

    it('rejects development and production database names', () => {
      expect(isTestDatabaseName('petro_dealer')).to.be.false;
      expect(isTestDatabaseName('petrodealer')).to.be.false;
      expect(isTestDatabaseName('petrol_management')).to.be.false;
      expect(isTestDatabaseName('production')).to.be.false;
      expect(isTestDatabaseName('live')).to.be.false;
      expect(isTestDatabaseName('')).to.be.false;
      expect(isTestDatabaseName(null)).to.be.false;
    });
  });

  describe('assertTestDatabase()', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('throws if NODE_ENV is not test', () => {
      process.env.NODE_ENV = 'development';
      expect(() => assertTestDatabase('mongodb://localhost:27017/petro_dealer_test')).to.throw(
        /Destructive test operation rejected: NODE_ENV must be 'test'/
      );
    });

    it('throws if database name is not a test database', () => {
      process.env.NODE_ENV = 'test';
      expect(() => assertTestDatabase('mongodb://localhost:27017/petro_dealer')).to.throw(
        /Refusing destructive operation against non-test database 'petro_dealer'/
      );
    });

    it('throws if database name cannot be determined', () => {
      process.env.NODE_ENV = 'test';
      expect(() => assertTestDatabase('mongodb://localhost:27017')).to.throw(
        /Cannot verify database name/
      );
    });

    it('passes when NODE_ENV is test and database contains test', () => {
      process.env.NODE_ENV = 'test';
      const result = assertTestDatabase('mongodb://localhost:27017/petro_dealer_test');
      expect(result).to.be.true;
    });
  });

  describe('assertDestructiveOperationAllowed()', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDevOps = process.env.ALLOW_DESTRUCTIVE_DEV_OPS;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      process.env.ALLOW_DESTRUCTIVE_DEV_OPS = originalDevOps;
    });

    it('strictly refuses destructive operations in production', () => {
      process.env.NODE_ENV = 'production';
      expect(() => assertDestructiveOperationAllowed(null, 'wipeDatabase')).to.throw(
        /Refusing 'wipeDatabase' in PRODUCTION/
      );
    });

    it('refuses destructive operations in development without explicit opt-in', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOW_DESTRUCTIVE_DEV_OPS;
      expect(() => assertDestructiveOperationAllowed(null, 'dropCollection')).to.throw(
        /Refusing 'dropCollection' in development/
      );
    });

    it('allows destructive operations in development only when explicit flag is true', () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_DESTRUCTIVE_DEV_OPS = 'true';
      expect(assertDestructiveOperationAllowed(null, 'manual_clean')).to.be.true;
    });

    it('in test environment, enforces test database name verification', () => {
      process.env.NODE_ENV = 'test';
      const fakeConn = { name: 'petro_dealer' }; // non-test
      expect(() => assertDestructiveOperationAllowed(fakeConn, 'clearDB')).to.throw(
        /Refusing destructive operation against non-test database 'petro_dealer'/
      );

      const validConn = { name: 'petro_dealer_test' };
      expect(assertDestructiveOperationAllowed(validConn, 'clearDB')).to.be.true;
    });
  });

  describe('getSafeDbDiagnostics()', () => {
    it('returns sanitized database information without secrets', () => {
      const mockConn = {
        name: 'petro_dealer_test',
        host: 'localhost',
        port: 27017,
        readyState: 1,
      };

      const diag = getSafeDbDiagnostics(mockConn);
      expect(diag.databaseName).to.equal('petro_dealer_test');
      expect(diag.connectionState).to.equal('connected');
      expect(diag.host).to.equal('localhost');
      expect(diag.port).to.equal(27017);
      expect(diag.isTestDatabase).to.be.true;
      expect(diag).to.not.have.property('password');
      expect(diag).to.not.have.property('user');
    });
  });
});
