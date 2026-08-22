import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getData, postData } from "../../utils/api";

const savedUser = JSON.parse(localStorage.getItem("currentUser") || "null");
export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      return (await postData("/auth/login", credentials)).data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Đăng nhập thất bại",
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
    loading: false,
    error: null,
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
        localStorage.setItem("currentUser", JSON.stringify(action.payload));
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      }),
});
export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
