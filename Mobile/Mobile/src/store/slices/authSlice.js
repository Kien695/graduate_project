// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginRequest, logoutRequest } from '../../api/auth.api';
import { storage } from '../../utils/storage';
import { resolveDeviceId } from '../../hooks/useDeviceId';
import { STORAGE_KEYS, DEVICE_TYPE } from '../../utils/constants';

// --- Đăng nhập ---
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const deviceId = await resolveDeviceId(); // id ổn định của thiết bị này
      const data = await loginRequest({
        email,
        password,
        deviceId,
        deviceType: DEVICE_TYPE, // luôn là 'mobile' — quan trọng cho giới hạn phiên
      });

      // Lưu token + user vào SecureStore
      await storage.set(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
      await storage.set(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      await storage.setObject(STORAGE_KEYS.CURRENT_USER, data.user);

      return data.user;
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;
      if (status === 423) return rejectWithValue('Tài khoản đang bị khóa. Vui lòng thử lại sau.');
      if (status === 401) return rejectWithValue(message || 'Sai email hoặc mật khẩu.');
      return rejectWithValue(message || 'Không thể kết nối tới hệ thống.');
    }
  }
);

// --- Đăng xuất ---
export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    const refreshToken = await storage.get(STORAGE_KEYS.REFRESH_TOKEN);
    if (refreshToken) await logoutRequest(refreshToken);
  } catch (e) {
    // Kể cả API lỗi vẫn xóa local để người dùng đăng xuất được
    console.warn('logout API error:', e);
  } finally {
    await storage.clearAuth();
  }
});

// --- Khôi phục phiên khi mở lại app ---
export const restoreSession = createAsyncThunk('auth/restore', async () => {
  const token = await storage.get(STORAGE_KEYS.ACCESS_TOKEN);
  const user = await storage.getObject(STORAGE_KEYS.CURRENT_USER);
  if (token && user) return user;
  throw new Error('no session');
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    restoring: true, // đang kiểm tra phiên cũ lúc mở app
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.restoring = false;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.restoring = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;