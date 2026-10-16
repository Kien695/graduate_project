import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as authApi from "../../api/auth.api";
import { session } from "../../utils/session";
const reject = (error, fallback, rejectWithValue) =>
  rejectWithValue(error.response?.data?.message || fallback);
export const login = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await authApi.loginRequest(payload);
      if (String(data.user?.role).toLowerCase() !== "customer") {
        await authApi.logoutRequest().catch(() => undefined);
        return rejectWithValue({
          message: "WebClient chỉ dành cho khách hàng.",
        });
      }
      session.save(data);
      return data.user;
    } catch (e) {
      const res = e.response?.data;
      if (e.response?.status === 423)
        return rejectWithValue({
          message: res?.message || "Tài khoản đang bị khóa.",
          failedAttempts: res?.failedAttempts,
          maxAttempts: res?.maxAttempts,
          lockedUntil: res?.lockedUntil,
        });
      return rejectWithValue({ message: res?.message || "Đăng nhập thất bại." });
    }
  },
);
export const restoreSession = createAsyncThunk(
  "auth/restore",
  async (_, { rejectWithValue }) => {
    if (!session.token()) return rejectWithValue(null);
    try {
      const user = await authApi.getCurrentUser();
      if (String(user?.role).toLowerCase() !== "customer")
        throw new Error("Không đúng tài khoản khách hàng.");
      session.saveUser(user);
      return user;
    } catch (e) {
      return reject(e, "Phiên đăng nhập không còn hiệu lực.", rejectWithValue);
    }
  },
);
export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    await authApi.logoutRequest();
  } finally {
    session.clear();
  }
});
export const updateProfile = createAsyncThunk(
  "auth/update",
  async (payload, { rejectWithValue }) => {
    try {
      const user = await authApi.updateCurrentUser(payload);
      session.saveUser(user);
      return user;
    } catch (e) {
      return reject(e, "Không thể cập nhật hồ sơ.", rejectWithValue);
    }
  },
);
export const updateAvatar = createAsyncThunk(
  "auth/avatar",
  async (file, { rejectWithValue }) => {
    try {
      const user = await authApi.uploadAvatar(file);
      session.saveUser(user);
      return user;
    } catch (e) {
      return reject(e, "Không thể cập nhật ảnh đại diện.", rejectWithValue);
    }
  },
);
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: session.user(),
    isAuthenticated: Boolean(session.token()),
    restoring: true,
    loading: false,
    error: null,
  },
  reducers: {
    sessionExpired: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.restoring = false;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(login.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(login.fulfilled, (s, a) => {
        s.loading = false;
        s.user = a.payload;
        s.isAuthenticated = true;
      })
      .addCase(login.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(restoreSession.fulfilled, (s, a) => {
        s.user = a.payload;
        s.isAuthenticated = true;
        s.restoring = false;
      })
      .addCase(restoreSession.rejected, (s, a) => {
        if (a.payload) session.clear();
        s.user = null;
        s.isAuthenticated = false;
        s.restoring = false;
      })
      .addCase(logout.fulfilled, (s) => {
        s.user = null;
        s.isAuthenticated = false;
      })
      .addCase(updateProfile.fulfilled, (s, a) => {
        s.user = a.payload;
      })
      .addCase(updateAvatar.fulfilled, (s, a) => {
        s.user = a.payload;
      }),
});
export const { sessionExpired, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
