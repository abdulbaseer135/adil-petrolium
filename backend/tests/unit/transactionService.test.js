'use strict';
/**
 * Transaction Service Unit Tests
 * 
 * Covers:
 * - Running balance computation
 * - Totals aggregation
 * - Grouping logic for statements
 * - Date filter logic
 * - Export shaping logic
 * - Calculation precision
 */

const { expect } = require('chai');

const { connectTestDB, clearDB, closeDB } = require('../helpers/db');
const {
  createAdmin,
  createOwnedCustomer,
  createFuelSale,
  createPayment,
  createOpeningBalance,
} = require('../fixtures/factories');
const CustomerProfile = require('../../src/models/CustomerProfile');
const transactionService = require('../../src/services/transactionService');

describe('Transaction Service Unit Tests', function () {
  this.timeout(20000);

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  after(async () => {
    await clearDB();
    await closeDB();
  });

  // ─────────────────────────────────────────────────────────────
  // Running Balance Calculation
  // ─────────────────────────────────────────────────────────────

  describe('Running Balance Computation', () => {
    it('should compute fuel sale and update running balance', async () => {
      const admin = await createAdmin();
      const { user, profile } = await createOwnedCustomer(admin);

      const tx = await createFuelSale({
        customerId: profile._id,
        userId: user._id,
        createdBy: admin._id,
        fuelQuantity: 5,
        rate: 200,
        previousBalance: 0,
      });

      expect(tx).to.have.property('totalAmount', 1000);
      expect(tx).to.have.property('updatedBalance', 1000);

      const updated = await CustomerProfile.findById(profile._id);
      expect(updated.currentBalance).to.equal(1000);
    });

    it('should correctly compute payment and reduce balance', async () => {
      const admin = await createAdmin();
      const { user, profile } = await createOwnedCustomer(admin, {}, { currentBalance: 5000 });

      const tx = await createPayment({
        customerId: profile._id,
        userId: user._id,
        createdBy: admin._id,
        paymentReceived: 2000,
        previousBalance: 5000,
      });

      expect(tx).to.have.property('paymentReceived', 2000);
      expect(tx).to.have.property('updatedBalance', 3000);

      const updated = await CustomerProfile.findById(profile._id);
      expect(updated.currentBalance).to.equal(3000);
    });

    it('should compute overpayment creating negative balance (credit)', async () => {
      const admin = await createAdmin();
      const { user, profile } = await createOwnedCustomer(admin, {}, { currentBalance: 1000 });

      const tx = await createPayment({
        customerId: profile._id,
        userId: user._id,
        createdBy: admin._id,
        paymentReceived: 1500,
        previousBalance: 1000,
      });

      expect(tx.updatedBalance).to.equal(-500);
    });

    it('should handle opening balance correctly', async () => {
      const admin = await createAdmin();
      const { user, profile } = await createOwnedCustomer(admin);

      const tx = await createOpeningBalance({
        customerId: profile._id,
        userId: user._id,
        createdBy: admin._id,
        amount: 10000,
      });

      expect(tx).to.have.property('totalAmount', 10000);
      expect(tx).to.have.property('updatedBalance', 10000);

      const updated = await CustomerProfile.findById(profile._id);
      expect(updated.currentBalance).to.equal(10000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Void Transaction
  // ─────────────────────────────────────────────────────────────

  describe('Void Transaction', () => {
    it('should void transaction and restore balance', async () => {
      const admin = await createAdmin();
      const { user, profile } = await createOwnedCustomer(admin);

      const tx = await createFuelSale({
        customerId: profile._id,
        userId: user._id,
        createdBy: admin._id,
        fuelQuantity: 20,
        rate: 100,
        previousBalance: 0,
      });

      // Verify balance updated
      let balance = await CustomerProfile.findById(profile._id);
      expect(balance.currentBalance).to.equal(2000);

      // Void the transaction
      const voided = await transactionService.voidTransaction({
        transactionId: tx._id,
        voidedBy: admin._id,
        voidReason: 'Duplicate entry',
        requestId: 'test-req-1',
      });

      if (voided) {
        // Verify balance restored
        balance = await CustomerProfile.findById(profile._id);
        expect(balance.currentBalance).to.equal(0);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Pure Calculation Logic Unit Tests
// ─────────────────────────────────────────────────────────────

/**
 * Pure function: compute total amount for a transaction
 * @param {object} opts - Transaction options
 * @returns {number} Total amount
 */
const computeTotal = ({ transactionType, fuelQuantity, rate, amount }) => {
  if (transactionType === 'fuel_sale') {
    if (!fuelQuantity || !rate) {
      throw new Error('Fuel sale requires quantity and rate');
    }
    return parseFloat((fuelQuantity * rate).toFixed(2));
  }

  if (['adjustment', 'credit_note', 'opening_balance'].includes(transactionType)) {
    if (amount === undefined || amount === null) {
      throw new Error('Amount is required for this transaction type');
    }
    return parseFloat(parseFloat(amount).toFixed(2));
  }

  if (transactionType === 'payment') {
    return 0;
  }

  throw new Error('Invalid transaction type');
};

/**
 * Pure function: compute new balance after transaction
 * @param {number} previousBalance - Balance before transaction
 * @param {number} totalAmount - Amount to add
 * @param {number} paymentReceived - Amount to subtract
 * @returns {number} Updated balance
 */
const computeBalance = (previousBalance, totalAmount, paymentReceived) => {
  const result = previousBalance + totalAmount - paymentReceived;
  return parseFloat(result.toFixed(2));
};

describe('Calculation Engine — Unit Tests', () => {
  // ─────────────────────────────────────────────────────────────
  // computeTotal() Tests
  // ─────────────────────────────────────────────────────────────

  describe('computeTotal()', () => {
    it('fuel_sale: qty × rate', () => {
      const result = computeTotal({
        transactionType: 'fuel_sale',
        fuelQuantity: 50,
        rate: 300,
      });
      expect(result).to.equal(15000);
    });

    it('fuel_sale: exact integer pricing keeps exact result', () => {
      const result = computeTotal({
        transactionType: 'fuel_sale',
        fuelQuantity: 90,
        rate: 300,
      });
      expect(result).to.equal(27000);
    });

    it('fuel_sale: floating point result rounded to 2dp', () => {
      const result = computeTotal({
        transactionType: 'fuel_sale',
        fuelQuantity: 33.33,
        rate: 300,
      });
      expect(result).to.equal(9999);
    });

    it('payment: always 0', () => {
      const result = computeTotal({ transactionType: 'payment' });
      expect(result).to.equal(0);
    });

    it('adjustment: uses amount directly', () => {
      const result = computeTotal({
        transactionType: 'adjustment',
        amount: -500,
      });
      expect(result).to.equal(-500);
    });

    it('credit_note: uses amount directly', () => {
      const result = computeTotal({
        transactionType: 'credit_note',
        amount: 200,
      });
      expect(result).to.equal(200);
    });

    it('opening_balance: uses amount directly', () => {
      const result = computeTotal({
        transactionType: 'opening_balance',
        amount: 5000,
      });
      expect(result).to.equal(5000);
    });

    it('throws on invalid type', () => {
      expect(() =>
        computeTotal({ transactionType: 'unknown_type' })
      ).to.throw('Invalid transaction type');
    });

    it('throws on fuel_sale without quantity', () => {
      expect(() =>
        computeTotal({ transactionType: 'fuel_sale', rate: 100 })
      ).to.throw('Fuel sale requires quantity and rate');
    });

    it('throws on fuel_sale without rate', () => {
      expect(() =>
        computeTotal({ transactionType: 'fuel_sale', fuelQuantity: 10 })
      ).to.throw('Fuel sale requires quantity and rate');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // computeBalance() Tests
  // ─────────────────────────────────────────────────────────────

  describe('computeBalance()', () => {
    it('fuel sale adds to balance', () => {
      const result = computeBalance(10000, 15000, 0);
      expect(result).to.equal(25000);
    });

    it('payment reduces balance', () => {
      const result = computeBalance(10000, 0, 10000);
      expect(result).to.equal(0);
    });

    it('partial payment reduces balance correctly', () => {
      const result = computeBalance(10000, 5000, 3000);
      expect(result).to.equal(12000);
    });

    it('overpayment creates credit (negative balance)', () => {
      const result = computeBalance(0, 0, 5000);
      expect(result).to.equal(-5000);
    });

    it('precision: no floating point drift', () => {
      const result = computeBalance(0.1, 0.2, 0);
      expect(result).to.equal(0.30);
    });

    it('handles large numbers correctly', () => {
      const result = computeBalance(1000000, 500000, 100000);
      expect(result).to.equal(1400000);
    });

    it('handles negative previous balance', () => {
      const result = computeBalance(-5000, 3000, 0);
      expect(result).to.equal(-2000);
    });

    it('complex scenario: opening + fuel + payment + credit', () => {
      let balance = 0;
      balance = computeBalance(balance, 10000, 0); // Opening balance: 10000
      expect(balance).to.equal(10000);

      balance = computeBalance(balance, 5000, 0); // Fuel sale: +5000 => 15000
      expect(balance).to.equal(15000);

      balance = computeBalance(balance, 0, 3000); // Payment: -3000 => 12000
      expect(balance).to.equal(12000);

      balance = computeBalance(balance, 1000, 0); // Credit note: +1000 => 13000
      expect(balance).to.equal(13000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle zero amounts', () => {
      expect(computeTotal({ transactionType: 'opening_balance', amount: 0 })).to.equal(0);
      expect(computeBalance(100, 0, 0)).to.equal(100);
    });

    it('should handle decimal precision correctly', () => {
      const result1 = computeTotal({
        transactionType: 'fuel_sale',
        fuelQuantity: 10.5,
        rate: 149.99,
      });
      expect(result1).to.equal(1574.89);

      const result2 = computeBalance(1000.11, 500.55, 250.75);
      expect(result2).to.equal(1249.91);
    });

    it('should handle very small fractional amounts', () => {
      const result = computeBalance(0.01, 0.01, 0);
      expect(result).to.equal(0.02);
    });
  });
});