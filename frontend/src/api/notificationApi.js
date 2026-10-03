import api from './axiosClient';

/**
 * Notification API — used by all 3 roles (Super Admin, Pump Admin, Customer)
 */

export const getNotifications = (page = 1, limit = 20) =>
  api.get(`/notifications?page=${page}&limit=${limit}`).then((r) => r.data);

export const getUnreadCount = () =>
  api.get('/notifications/unread-count').then((r) => r.data);

export const markAsRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((r) => r.data);

export const markAllAsRead = () =>
  api.patch('/notifications/read-all').then((r) => r.data);

export const deleteNotification = (id) =>
  api.delete(`/notifications/${id}`).then((r) => r.data);
