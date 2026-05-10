'use strict';
const { expect } = require('chai');
const { addClient, sendEvent } = require('../../src/utils/sse');

describe('SSE Utility', function () {
  let mockRes1, mockRes2;

  beforeEach(() => {
    // Create mock response objects
    mockRes1 = {
      write: function (data) { this.written = (this.written || '') + data; },
      on: function (event, cb) { if (event === 'close') this.closeHandler = cb; },
      written: '',
      closeHandler: null,
    };

    mockRes2 = {
      write: function (data) { this.written = (this.written || '') + data; },
      on: function (event, cb) { if (event === 'close') this.closeHandler = cb; },
      written: '',
      closeHandler: null,
    };
  });

  describe('addClient', function () {
    it('should add client to a customer', () => {
      addClient('CUST-001', mockRes1);
      // Send event should successfully write to the client
      sendEvent('CUST-001', 'test', { data: 'test' });
      expect(mockRes1.written).to.include('event: test');
      expect(mockRes1.written).to.include('{"data":"test"}');
    });

    it('should handle multiple clients for same customer', () => {
      addClient('CUST-001', mockRes1);
      addClient('CUST-001', mockRes2);

      sendEvent('CUST-001', 'update', { balance: 5000 });

      expect(mockRes1.written).to.include('event: update');
      expect(mockRes2.written).to.include('event: update');
      expect(mockRes1.written).to.include('{"balance":5000}');
      expect(mockRes2.written).to.include('{"balance":5000}');
    });

    it('should not send events to other customers', () => {
      addClient('CUST-001', mockRes1);
      addClient('CUST-002', mockRes2);

      sendEvent('CUST-001', 'notify', { msg: 'test' });

      expect(mockRes1.written).to.include('event: notify');
      expect(mockRes2.written).to.equal('');
    });

    it('should register close handler on client', () => {
      addClient('CUST-001', mockRes1);
      expect(mockRes1.closeHandler).to.be.a('function');
    });
  });

  describe('sendEvent', function () {
    it('should format event with correct SSE syntax', () => {
      addClient('CUST-001', mockRes1);
      sendEvent('CUST-001', 'balance_update', { amount: 1000 });

      const expected = 'event: balance_update\ndata: {"amount":1000}\n\n';
      expect(mockRes1.written).to.equal(expected);
    });

    it('should not error on non-existent customer', () => {
      expect(() => {
        sendEvent('CUST-NONEXISTENT', 'event', {});
      }).to.not.throw();
    });

    it('should ignore write errors on individual clients', () => {
      const errorRes = {
        write: function () { throw new Error('Write failed'); },
        on: function () {},
      };
      addClient('CUST-001', errorRes);
      addClient('CUST-001', mockRes1);

      expect(() => {
        sendEvent('CUST-001', 'test', {});
      }).to.not.throw();
      expect(mockRes1.written).to.include('event: test');
    });

    it('should handle complex data structures', () => {
      addClient('CUST-001', mockRes1);
      const complexData = {
        customer: 'Ali',
        transactions: [1000, 2000],
        metadata: { type: 'payment' },
      };
      sendEvent('CUST-001', 'complex', complexData);

      expect(mockRes1.written).to.include('event: complex');
      expect(mockRes1.written).to.include('Ali');
      expect(mockRes1.written).to.include('[1000,2000]');
    });

    it('should handle numeric customer IDs', () => {
      addClient(123, mockRes1);
      sendEvent('123', 'test', {});
      expect(mockRes1.written).to.include('event: test');
    });
  });

  describe('cleanup on connection close', function () {
    it('should remove client from map on close', () => {
      addClient('CUST-001', mockRes1);
      mockRes1.closeHandler();

      // After close, sendEvent should not write to closed client
      sendEvent('CUST-001', 'test', {});
      expect(mockRes1.written).to.equal('');
    });

    it('should remove customer entry when no clients remain', () => {
      addClient('CUST-001', mockRes1);
      mockRes1.closeHandler();

      // Send event should not error (customer entry removed)
      expect(() => {
        sendEvent('CUST-001', 'test', {});
      }).to.not.throw();
    });

    it('should keep customer entry if other clients exist', () => {
      addClient('CUST-001', mockRes1);
      addClient('CUST-001', mockRes2);

      mockRes1.closeHandler();
      sendEvent('CUST-001', 'test', {});

      expect(mockRes2.written).to.include('event: test');
    });
  });
});
