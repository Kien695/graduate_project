import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getData, postData, putData } from "../../utils/api";
import { ADMIN_ACCESS_ERROR, hasAdminAccess } from "../../utils/adminAccess";

const savedUser = JSON.parse(localStorage.getItem("currentUser") || "null");
export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const data = (await postData("/auth/login", credentials)).data;
      if (!hasAdminAccess(data.user)) {
        await postData("/auth/logout", {
          refreshToken: data.refreshToken,
        }).catch(() => undefined);
        return rejectWithValue(ADMIN_ACCESS_ERROR);
      }
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Đăng nhập thất bại",
      );
    }
  },
);
export const updateCurrentUser = createAsyncThunk(
  "auth/updateMe",
  async (profile, { rejectWithValue }) => {
    try {
      return (await putData("/users/me", profile)).data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không thể cập nhật hồ sơ",
      );
    }
  },
);
export const updateCurrentAvatar = createAsyncThunk(
  "auth/updateAvatar",
  async (file, { rejectWithValue }) => {
    try {
      const form = new FormData();
      form.append("avatar", file);
      return (await putData("/users/me/avatar", form)).data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không thể cập nhật ảnh đại diện",
      );
    }
  },
);
export const changeCurrentPassword = createAsyncThunk(
  "auth/changePassword",
  async (payload, { rejectWithValue }) => {
    try {
      await postData("/auth/change-password", payload);
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không thể đổi mật khẩu",
      );
    }
  },
);
export const loadCurrentUser = createAsyncThunk(
  "auth/me",
  async (_, { rejectWithValue }) => {
    try {
      return (await getData("/users/me")).data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không thể tải tài khoản",
      );
    }
  },
);
export const loadNavigationPermissions = createAsyncThunk(
  "auth/navigationPermissions",
  async (_, { rejectWithValue }) => {
    try {
      return (await getData("/users/me/database-permissions")).data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không thể tải quyền truy cập",
      );
    }
  },
);
export const logoutUser = createAsyncThunk("auth/logout", async () => {
  try {
    await postData("/auth/logout");
  } finally {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("currentUser");
  }
});
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: savedUser,
    accessToken: localStorage.getItem("accessToken"),
    isAuthenticated: Boolean(localStorage.getItem("accessToken")),
    validated: !localStorage.getItem("accessToken"),
    loading: false,
    error: null,
    navigationPermissions: null,
    permissionsLoading: false,
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.validated = true;
        state.navigationPermissions = null;
        localStorage.setItem("accessToken", action.payload.accessToken);
        localStorage.setItem(
          "currentUser",
          JSON.stringify(action.payload.user),
        );
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.validated = true;
        localStorage.setItem("currentUser", JSON.stringify(action.payload));
      })
      .addCase(loadCurrentUser.rejected, (state, action) => {
        // A profile API error (for example 403 or a temporary server error)
        // must not be treated as an explicit logout. The API interceptor owns
        // the 401/refresh-token flow and clears storage only when it is terminal.
        state.validated = true;
        state.error = action.payload || "Không thể tải tài khoản";
      })
      .addCase(updateCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        localStorage.setItem("currentUser", JSON.stringify(action.payload));
      })
      .addCase(updateCurrentAvatar.fulfilled, (state, action) => {
        state.user = action.payload;
        localStorage.setItem("currentUser", JSON.stringify(action.payload));
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.validated = true;
        state.navigationPermissions = null;
      })
      .addCase(loadNavigationPermissions.pending, (state) => {
        state.permissionsLoading = true;
      })
      .addCase(loadNavigationPermissions.fulfilled, (state, action) => {
        state.permissionsLoading = false;
        state.navigationPermissions = action.payload?.unrestricted
          ? { unrestricted: true }
          : { unrestricted: false, ...(action.payload?.features || {}) };
      })
      .addCase(loadNavigationPermissions.rejected, (state, action) => {
        state.permissionsLoading = false;
        state.navigationPermissions = { unrestricted: false };
        state.error = action.payload;
      }),
});
export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
