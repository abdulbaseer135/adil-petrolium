'use strict';

const request = require('supertest');
const app = require('../../src/server');

const getCSRFToken = async () => ({ token: null, cookie: null });

const isAgentWithJar = (client) => client && typeof client.jar === 'object';

const loginWithCsrf = async (agent, credentials) => {
  const client = agent && typeof agent.post === 'function' ? agent : request(app);
  const req = client.post('/api/v1/auth/login');
  if (!isAgentWithJar(agent)) {
    req.set('Cookie', '');
  }
  return req.send(credentials);
};

const requestWithCsrf = async (agentOrApp, method, path, body) => {
  const client = agentOrApp && typeof agentOrApp[method] === 'function' ? agentOrApp : request(app);
  const req = client[method](path);
  if (!isAgentWithJar(agentOrApp)) {
    req.set('Cookie', '');
  }
  const payload = body !== undefined ? body : (method === 'post' || method === 'put' || method === 'patch' ? {} : undefined);
  if (payload !== undefined) {
    return req.send(payload);
  }
  return req;
};

const postWithCsrf = (agentOrApp, path, body) => requestWithCsrf(agentOrApp, 'post', path, body);
const putWithCsrf = (agentOrApp, path, body) => requestWithCsrf(agentOrApp, 'put', path, body);
const deleteWithCsrf = (agentOrApp, path, body) => requestWithCsrf(agentOrApp, 'delete', path, body);

module.exports = {
  getCSRFToken,
  loginWithCsrf,
  postWithCsrf,
  putWithCsrf,
  deleteWithCsrf,
};