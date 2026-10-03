import client from './axiosClient';

export const getSuperAdminDashboard = () => client.get('/super-admin/dashboard');

export const getPetrolPumps = (params) => client.get('/super-admin/petrol-pumps', { params });

export const getPetrolPumpDetail = (id) => client.get(`/super-admin/petrol-pumps/${id}`);

export const approvePetrolPump = (id) => client.patch(`/super-admin/petrol-pumps/${id}/approve`);

export const rejectPetrolPump = (id, reason) =>
  client.patch(`/super-admin/petrol-pumps/${id}/reject`, { reason });

export const suspendPetrolPump = (id, reason) =>
  client.patch(`/super-admin/petrol-pumps/${id}/suspend`, { reason });

export const reactivatePetrolPump = (id) =>
  client.patch(`/super-admin/petrol-pumps/${id}/reactivate`);

export const getPlatformAdmins = (params) => client.get('/super-admin/admins', { params });

export const getPlatformCustomers = (params) => client.get('/super-admin/customers', { params });

export const getPlatformAuditLogs = (params) => client.get('/super-admin/audit-logs', { params });
