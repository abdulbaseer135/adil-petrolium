'use strict';
/**
 * Test App Helper
 * 
 * Provides reusable test app bootstrap without starting HTTP server.
 * Express app can be configured for testing without listening on a port.
 */

const app = require('../../src/server');

/**
 * Get the Express app instance for testing
 * @returns {object} Express app configured but not listening
 */
const getTestApp = () => app;

/**
 * Create a test agent with persistence (for cookies, auth state)
 * @param {object} testFramework - require('supertest') 
 * @returns {object} Supertest agent bound to test app
 * 
 * Usage:
 *   const request = require('supertest');
 *   const agent = createAgent(request);
 *   const res = await agent.post('/api/v1/auth/login').send({ ... });
 */
const createAgent = (request) => {
  return request.agent(app);
};

module.exports = {
  getTestApp,
  createAgent,
};
