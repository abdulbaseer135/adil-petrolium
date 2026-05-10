'use strict';
const { expect } = require('chai');
const request = require('supertest');
const app = require('../../src/server');
const { connectTestDB, clearDB, closeDB } = require('../helpers/setup');
const { createCustomer, createAdmin } = require('../fixtures/factories');
const { loginWithCsrf } = require('../helpers/csrf');

/** SSE responses stay open; resolve on first response bytes with buffering disabled */
const getSseResponse = (agent, path) =>
  new Promise((resolve, reject) => {
    const req = agent.get(path).set('Accept', 'text/event-stream').buffer(false);
    const timer = setTimeout(() => reject(new Error('SSE test timed out waiting for response')), 8000);
    req
      .on('response', (res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      })
      .end();
  });

describe('Events Routes Integration', function () {
  this.timeout(15000);

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

      const res = await getSseResponse(agent, '/api/v1/events/transactions');
      expect(res.statusCode).to.equal(200);
      expect(String(res.headers['content-type'] || '')).to.include('text/event-stream');
      expect(res.headers['cache-control']).to.equal('no-cache');
      expect(String(res.headers.connection || '').toLowerCase()).to.equal('keep-alive');
      res.destroy();
    });

    it('should send connection ping', async () => {
      const { user } = await createCustomer();
      const agent = request.agent(app);

      await loginWithCsrf(agent, {
        email: user.email,
        password: 'Cust@12345678',
      });

      // Attach `data` inside `response` (sync) so the first chunk cannot be missed.
      const text = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('SSE ping timeout')), 8000);
        const parts = [];
        agent
          .get('/api/v1/events/transactions')
          .set('Accept', 'text/event-stream')
          .buffer(false)
          .on('response', (res) => {
            if (res.statusCode !== 200) {
              clearTimeout(timer);
              reject(new Error(`expected 200, got ${res.statusCode}`));
              return;
            }
            res.setEncoding('utf8');
            res.on('data', (c) => {
              parts.push(c);
              if (parts.join('').includes(': connected')) {
                clearTimeout(timer);
                res.destroy();
                resolve(parts.join(''));
              }
            });
            res.on('error', (e) => {
              clearTimeout(timer);
              reject(e);
            });
          })
          .on('error', (e) => {
            clearTimeout(timer);
            reject(e);
          })
          .end();
      });

      expect(text).to.include(': connected');
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

      const res1 = await getSseResponse(agent1, '/api/v1/events/transactions');
      const res2 = await getSseResponse(agent2, '/api/v1/events/transactions');

      expect(res1.statusCode).to.equal(200);
      expect(res2.statusCode).to.equal(200);
      res1.destroy();
      res2.destroy();
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
