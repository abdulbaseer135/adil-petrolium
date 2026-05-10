import client from './axiosClient';

export const loginApi            = (data) => client.post('/auth/login', data);
export const logoutApi           = ()     => client.post('/auth/logout');
export const getMeApi            = ()     => client.get('/auth/me');
export const refreshApi          = ()     => client.post('/auth/refresh');
export const adminChangePassword = (data) => client.put('/auth/admin/profile/password', data);

// ─── Recovery feature removed ─────────────────────────────────
// These are stubbed so existing page imports don't break the build.
// Remove these stubs only after RecoveryKey.jsx and AdminRecover.jsx are deleted or updated.
export const recoverAdminPassword  = () => Promise.reject(new Error('Recovery feature removed'));
export const regenerateRecoveryKey = () => Promise.reject(new Error('Recovery feature removed'));