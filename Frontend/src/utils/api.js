import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});
const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const isAuthRequest = request?.url?.includes("/auth/login") || request?.url?.includes("/auth/refresh-token");
    if (error.response?.status === 401 && request && !request._retry && !isAuthRequest) {
      request._retry = true;
      try {
        refreshPromise ||= refreshClient.post("/auth/refresh-token").finally(() => { refreshPromise = null; });
        const response = await refreshPromise;
        const token = response.data.data.accessToken;
        localStorage.setItem("accessToken", token);
        request.headers.Authorization = `Bearer ${token}`;
        return api(request);
      } catch (refreshError) {
        const terminal = [400, 401, 423].includes(refreshError.response?.status);
        if (terminal) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("currentUser");
          if (window.location.pathname !== "/admin/login") window.location.assign("/admin/login");
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export const getData = (url, config) => api.get(url, config).then((res) => res.data);
export const postData = (url, data, config) => api.post(url, data, config).then((res) => res.data);
export const putData = (url, data, config) => api.put(url, data, config).then((res) => res.data);
export const patchData = (url, data, config) => api.patch(url, data, config).then((res) => res.data);
export const deleteData = (url, data, config) => api.delete(url, { ...config, data }).then((res) => res.data);

export default api;
