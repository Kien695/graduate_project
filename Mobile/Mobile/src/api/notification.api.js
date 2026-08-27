import client from './client';

export const getNotifications = async () => (await client.get('/notifications')).data.data;
export const getNotification = async (id) => (await client.get(`/notifications/${id}`)).data.data;
export const markNotificationRead = async (id) => (await client.patch(`/notifications/${id}/read`)).data.data;
