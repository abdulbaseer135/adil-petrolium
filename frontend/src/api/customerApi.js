import client from './axiosClient';

// ─── Admin ──────────────────────────────────────────────────
export const getCustomers    = (params)     => client.get('/customers', { params });
export const createCustomer  = (data)       => client.post('/customers', data);
export const getCustomerById = (id)         => client.get('/customers/' + id);
export const updateCustomer  = (id, data)   => client.put('/customers/' + id, data);

// ─── Customer Self ──────────────────────────────────────────
export const getMyProfile      = ()         => client.get('/me/profile');
export const getMyTransactions = (params)   => client.get('/me/transactions', { params });

export const downloadMyStatement = (params) =>
  client.get('/me/statement/download', {
    params,
    responseType: 'blob',
  });

// Monthly summary for customer
export const getMySummaryMonthly = (year) =>
  client.get('/me/summary/monthly', { params: { year } });

// Yearly summary for customer
export const getMySummaryYearly = (year) =>
  client.get('/me/summary/yearly', { params: { year } });