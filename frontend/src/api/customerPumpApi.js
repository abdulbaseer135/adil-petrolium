import client from './axiosClient';

export const getAvailablePumps = () => client.get('/customer/pumps/available');
export const getPublicPetrolPumps = () => client.get('/petrol-pumps/public');

export const getMyPumpAccounts = () => client.get('/customer/pumps/my-accounts');

// Connection Requests (Customer)
export const submitLinkRequest = (data) => client.post('/customer/pumps/link-request', data);
export const linkPumpAccount = (data) => client.post('/customer/pumps/link-request', data);
export const getMyLinkRequests = () => client.get('/customer/pumps/link-requests');
export const cancelLinkRequest = (id) => client.patch(`/customer/pumps/link-requests/${id}/cancel`);

// Account Details & Financials (Customer)
export const getPumpAccountDetail = (pumpAccountId) =>
  client.get(`/customer/pumps/${pumpAccountId}/dashboard`);

export const getPumpAccountTransactions = (pumpAccountId, params) =>
  client.get(`/customer/pumps/${pumpAccountId}/transactions`, { params });

export const getPumpAccountMonthly = (pumpAccountId, params) =>
  client.get(`/customer/pumps/${pumpAccountId}/summary/monthly`, { params });

export const getPumpAccountYearly = (pumpAccountId, params) =>
  client.get(`/customer/pumps/${pumpAccountId}/summary/yearly`, { params });

export const downloadPumpStatement = (pumpAccountId, params) =>
  client.get(`/customer/pumps/${pumpAccountId}/statement/download`, {
    params,
    responseType: 'blob',
  });

// Admin Link Request Review
export const getAdminLinkRequests = (params) =>
  client.get('/admin/customer-links', { params });

export const approveAdminLinkRequest = (id, data) =>
  client.patch(`/admin/customer-links/${id}/approve`, data);

export const rejectAdminLinkRequest = (id, data) =>
  client.patch(`/admin/customer-links/${id}/reject`, data);

