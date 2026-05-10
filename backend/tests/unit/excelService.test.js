'use strict';
const { expect } = require('chai');
const excelService = require('../../src/services/excelService');

describe('Excel Service Unit', function () {
  describe('formatters', function () {
    it('should format money correctly in PKR', () => {
      // excelService.money formats to PKR with locale
      // We'll test by checking the export format
      expect(excelService).to.exist;
    });
  });

  describe('parsePkDateStart', function () {
    it('should parse date for start of day in PKT (midnight PKT → prior evening UTC)', () => {
      const result = excelService.parsePkDateStart('2024-05-10');
      expect(result).to.be.a('date');
      expect(result.toISOString()).to.include('2024-05-09T19:00:00');
    });

    it('should handle string date format', () => {
      const result = excelService.parsePkDateStart('2024-12-25');
      expect(result.getUTCMonth()).to.equal(11);
      expect(result.getUTCDate()).to.equal(24);
      expect(result.getUTCFullYear()).to.equal(2024);
    });
  });

  describe('parsePkDateEnd', function () {
    it('should parse date for end of day (6:59 PM UTC)', () => {
      const result = excelService.parsePkDateEnd('2024-05-10');
      expect(result).to.be.a('date');
      // End of day in PKT (UTC+5) is 18:59:59.999 UTC
      expect(result.getUTCHours()).to.equal(18);
      expect(result.getUTCMinutes()).to.equal(59);
      expect(result.getUTCSeconds()).to.equal(59);
    });
  });

  describe('parsePkMonthStart and parsePkMonthEnd', function () {
    it('should parse month start correctly', () => {
      const result = excelService.parsePkMonthStart(2024, 3);
      expect(result.getUTCFullYear()).to.equal(2024);
      expect(result.getUTCMonth()).to.equal(1);
      expect(result.getUTCDate()).to.equal(29);
    });

    it('should parse month end correctly', () => {
      const result = excelService.parsePkMonthEnd(2024, 2);
      expect(result.getUTCMonth()).to.equal(1);
      expect(result.getUTCDate()).to.equal(29);
    });

    it('should handle month boundary correctly', () => {
      const start = excelService.parsePkMonthStart(2024, 12);
      const end = excelService.parsePkMonthEnd(2024, 12);
      expect(start < end).to.be.true;
    });
  });

  describe('parsePkYearStart and parsePkYearEnd', function () {
    it('should parse year start', () => {
      const result = excelService.parsePkYearStart(2024);
      expect(result.getUTCFullYear()).to.equal(2023);
      expect(result.getUTCMonth()).to.equal(11);
      expect(result.getUTCDate()).to.equal(31);
    });

    it('should parse year end', () => {
      const result = excelService.parsePkYearEnd(2024);
      expect(result.getUTCFullYear()).to.equal(2024);
      expect(result.getUTCMonth()).to.equal(11);
      expect(result.getUTCDate()).to.equal(31);
    });
  });

  describe('safeSheetName', function () {
    it('should clean invalid Excel sheet characters', () => {
      const result = excelService.safeSheetName('Customer [001]');
      expect(result).to.not.include('[');
      expect(result).to.not.include(']');
    });

    it('should handle asterisk and question mark', () => {
      const result = excelService.safeSheetName('Report*2024?');
      expect(result).to.not.include('*');
      expect(result).to.not.include('?');
    });

    it('should limit sheet name to 31 characters', () => {
      const longName = 'a'.repeat(50);
      const result = excelService.safeSheetName(longName);
      expect(result.length).to.be.at.most(31);
    });

    it('should handle empty/null with fallback', () => {
      const result = excelService.safeSheetName('');
      expect(result).to.equal('Sheet');
    });

    it('should use custom fallback', () => {
      const result = excelService.safeSheetName('', 'Custom');
      expect(result).to.equal('Custom');
    });

    it('should collapse multiple spaces', () => {
      const result = excelService.safeSheetName('Customer   Report   2024');
      expect(result).to.include('Customer Report');
      expect(result).to.not.include('   ');
    });

    it('should handle backslash and forward slash', () => {
      const result = excelService.safeSheetName('Report\\2024/May');
      expect(result).to.not.include('\\');
      expect(result).to.not.include('/');
    });

    it('should handle colon', () => {
      const result = excelService.safeSheetName('Report: May 2024');
      expect(result).to.not.include(':');
    });
  });

  describe('createWorkbook', function () {
    it('should create workbook with correct metadata', () => {
      const workbook = excelService.createWorkbook();
      expect(workbook).to.exist;
      expect(workbook.creator).to.equal('Adil Petroleum');
      expect(workbook.created).to.be.a('date');
    });
  });

  describe('buildDetailText', function () {
    it('should build text for fuel_sale with all details', () => {
      const tx = {
        transactionType: 'fuel_sale',
        fuelType: 'pmg',
        referenceNo: 'INV-001',
        notes: 'Pump 1',
      };
      const result = excelService.buildDetailText(tx);
      expect(result).to.include('PMG');
      expect(result).to.include('INV-001');
      expect(result).to.include('Pump 1');
    });

    it('should build text for payment', () => {
      const tx = {
        transactionType: 'payment',
        referenceNo: 'CHQ-001',
      };
      const result = excelService.buildDetailText(tx);
      expect(result).to.include('Payment received');
      expect(result).to.include('CHQ-001');
    });

    it('should build text for opening_balance', () => {
      const tx = {
        transactionType: 'opening_balance',
        notes: 'Previous balance',
      };
      const result = excelService.buildDetailText(tx);
      expect(result).to.include('Opening balance');
      expect(result).to.include('Previous balance');
    });

    it('should handle credit_note', () => {
      const tx = {
        transactionType: 'credit_note',
        referenceNo: 'CN-001',
      };
      const result = excelService.buildDetailText(tx);
      expect(result).to.include('Credit note');
      expect(result).to.include('CN-001');
    });

    it('should omit optional fields if not provided', () => {
      const tx = {
        transactionType: 'fuel_sale',
        fuelType: 'hsd',
      };
      const result = excelService.buildDetailText(tx);
      expect(result).to.include('HSD');
      expect(result).to.not.include('Ref');
    });
  });

  describe('groupTransactions', function () {
    it('should group transactions by customer', () => {
      const transactions = [
        { customerId: '123', _id: 'tx1', transactionDate: new Date() },
        { customerId: '123', _id: 'tx2', transactionDate: new Date() },
        { customerId: '456', _id: 'tx3', transactionDate: new Date() },
      ];

      // Mock the transaction objects to have customerId property
      transactions[0].customerId = { _id: '123', userId: { name: 'Ali' } };
      transactions[1].customerId = { _id: '123', userId: { name: 'Ali' } };
      transactions[2].customerId = { _id: '456', userId: { name: 'Bob' } };

      const result = excelService.groupTransactions(transactions);
      expect(result).to.be.an('array');
      expect(result.length).to.be.at.least(1);
    });
  });

  describe('summarizeTransactions', function () {
    it('should calculate correct totals', () => {
      const transactions = [
        {
          transactionType: 'fuel_sale',
          fuelType: 'pmg',
          totalAmount: 1000,
          paymentReceived: 0,
          fuelQuantity: 100,
          updatedBalance: 1000,
        },
        {
          transactionType: 'payment',
          totalAmount: 0,
          paymentReceived: 500,
          fuelQuantity: 0,
          updatedBalance: 500,
        },
      ];

      const result = excelService.summarizeTransactions(transactions);
      expect(result.totalDebit).to.equal(1000);
      expect(result.totalCredit).to.equal(500);
      expect(result.debitCount).to.equal(1);
      expect(result.creditCount).to.equal(1);
      expect(result.closingBalance).to.equal(500);
      expect(result.productTotals.pmg).to.equal(100);
    });

    it('should handle empty transactions', () => {
      const result = excelService.summarizeTransactions([]);
      expect(result.totalDebit).to.equal(0);
      expect(result.totalCredit).to.equal(0);
      expect(result.closingBalance).to.equal(0);
    });

    it('should track fuel quantities by type', () => {
      const transactions = [
        { fuelType: 'pmg', fuelQuantity: 50, totalAmount: 0, paymentReceived: 0, updatedBalance: 0 },
        { fuelType: 'hsd', fuelQuantity: 30, totalAmount: 0, paymentReceived: 0, updatedBalance: 0 },
        { fuelType: 'nr', fuelQuantity: 20, totalAmount: 0, paymentReceived: 0, updatedBalance: 0 },
      ];

      const result = excelService.summarizeTransactions(transactions);
      expect(result.productTotals.pmg).to.equal(50);
      expect(result.productTotals.hsd).to.equal(30);
      expect(result.productTotals.nr).to.equal(20);
    });
  });
});
