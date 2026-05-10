'use strict';
const { expect } = require('chai');
const request = require('supertest');
const app = require('../../src/server');
const { connectTestDB, clearDB, closeDB } = require('../helpers/setup');
const { createCustomer, createAdmin } = require('../fixtures/factories');
const { loginWithCsrf } = require('../helpers/csrf');

describe('Events Routes Integration', function () {
  this.timeout(10000);

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDB();
  });

  after(async () => {
    await clearDB();
    await closeDB();
  });

  describe('GET /api/v1/events/transactions', function () {
    it('should reject without authentication', async () => {
      const res = await request(app).get('/api/v1/events/transactions');
      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
    });

    it('should establish SSE connection with authenticated customer', async () => {
      const { user, profile } = await createCustomer();
      const agent = request.agent(app);

      // Login to get auth token
      const loginRes = await loginWithCsrf(agent, {
        email: user.email,
        password: 'Cust@12345678',
      });
      expect(loginRes.status).to.equal(200);

      // Now connect to SSE
      const res = await agent.get('/api/v1/events/transactions').set('Accept', 'text/event-stream');

      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.include('text/event-stream');
      expect(res.headers['cache-control']).to.equal('no-cache');
      expect(res.headers.connection).to.equal('keep-alive');
    });

    it('should send connection ping', async () => {
      const { user } = await createCustomer();
      const agent = request.agent(app);

      await loginWithCsrf(agent, {
        email: user.email,
        password: 'Cust@12345678',
      });

      const res = await agent.get('/api/v1/events/transactions').set('Accept', 'text/event-stream');

      expect(res.text).to.include(': connected');
    });

    it('should handle multiple concurrent connections', async () => {
      const { user } = await createCustomer();
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await loginWithCsrf(agent1, {
        email: user.email,
        password: 'Cust@12345678',
      });

      await loginWithCsrf(agent2, {
        email: user.email,
        password: 'Cust@12345678',
      });

      const res1 = await agent1.get('/api/v1/events/transactions');
      const res2 = await agent2.get('/api/v1/events/transactions');

      expect(res1.status).to.equal(200);
      expect(res2.status).to.equal(200);
    });

    it('should prevent customer from accessing other customer SSE', async () => {
      const { user: user1 } = await createCustomer();
      const { user: user2, profile: profile2 } = await createCustomer();

      const agent = request.agent(app);

      await loginWithCsrf(agent, {
        email: user1.email,
        password: 'Cust@12345678',
      });

      // Try to access user2's customer ID
      const res = await agent.get(`/api/v1/events/transactions?customerId=${profile2._id}`);

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
    });
  });
});
