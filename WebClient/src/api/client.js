import axios from "axios";
import { session } from "../utils/session";
const baseURL = import.meta.env.VITE_API_URL || "/api";
const client = axios.create({ baseURL, withCredentials: true, timeout: 15000 });
const refreshClient = axios.create({ baseURL, withCredentials: true, timeout: 15000 });
let refreshPromise;
let onSessionExpired;
export const registerSessionExpiredHandler = (handler) => { onSessionExpired = handler; };
client.interceptors.request.use((config) => { const token = session.token(); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
client.interceptors.response.use((response) => response, async (error) => {
  const request = error.config;
  const authRequest = request?.url?.includes("/auth/login") || request?.url?.includes("/auth/refresh-token");
  if (error.response?.status === 401 && request && !request._retry && !authRequest) {
    request._retry = true;
    try {
      refreshPromise ||= refreshClient.post("/auth/refresh-token").finally(() => { refreshPromise = null; });
      const response = await refreshPromise;
      const token = response.data.data.accessToken;
      session.saveToken(token);
      request.headers.Authorization = `Bearer ${token}`;
      return client(request);
    } catch (refreshError) {
      if ([400, 401, 423].includes(refreshError.response?.status)) { session.clear(); onSessionExpired?.(); }
      return Promise.reject(refreshError);
    }
  }
  return Promise.reject(error);
});
export default client;
