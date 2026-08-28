// src/api/client.js
import axios from 'axios';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';


const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api', // 10.0.2.2 = localhost của máy host trên emulator Android
  timeout: 10000,
});

let refreshPromise = null;

// ---- Request: gắn access token vào header ----
client.interceptors.request.use(async (config) => {
  const token = await storage.get(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Response: tự refresh khi gặp 401 ----
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const isAuthRequest =
      request?.url?.includes('/auth/login') ||
      request?.url?.includes('/auth/refresh-token');

    if (error.response?.status === 401 && request && !request._retry && !isAuthRequest) {
      request._retry = true;
      try {
        // Gộp nhiều request 401 cùng lúc vào 1 lần refresh duy nhất
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshToken = await storage.get(STORAGE_KEYS.REFRESH_TOKEN);
            // KHÁC web: gửi refreshToken qua body vì mobile không có cookie
            const res = await client.post('/auth/refresh-token', { refreshToken });
            return res.data.data.accessToken;
          })().finally(() => { refreshPromise = null; });
        }

        const newToken = await refreshPromise;
        await storage.set(STORAGE_KEYS.ACCESS_TOKEN, newToken);
        request.headers.Authorization = `Bearer ${newToken}`;
        return client(request);
      } catch (refreshError) {
        // Refresh thất bại → phiên hết hạn hoặc bị thu hồi (vd: đăng nhập thiết bị mới)
        await storage.clearAuth();
        // Không tự điều hướng ở đây — để RootNavigator tự chuyển về Login khi isAuthenticated đổi
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;