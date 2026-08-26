// src/api/auth.api.js
import client from './client';

// Đăng nhập. credentials = { email, password, deviceId, deviceType }
// Backend trả { success, message, data: { user, accessToken, refreshToken } }
export const loginRequest = async (credentials) => {
  const res = await client.post('/auth/login', credentials);
  return res.data.data; // bóc lấy phần data: { user, accessToken, refreshToken }
};

// Đăng xuất — gửi refreshToken qua body (mobile không có cookie như web)
export const logoutRequest = async (refreshToken) => {
  const res = await client.post('/auth/logout', { refreshToken });
  return res.data;
};

export const registerCustomer = async (payload) => {
  const res = await client.post('/auth/register/customer', payload);
  return res.data;
};
