import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getUnreadCount } from "../../api/notification.api";
export const fetchUnreadCount = createAsyncThunk(
  "notifications/count",
  async () => getUnreadCount(),
);
const slice = createSlice({
  name: "notifications",
  initialState: { unreadCount: 0 },
  reducers: {
    notificationRead: (s) => {
      s.unreadCount = Math.max(0, s.unreadCount - 1);
    },
  },
  extraReducers: (b) =>
    b.addCase(fetchUnreadCount.fulfilled, (s, a) => {
      s.unreadCount = Number(a.payload?.count ?? a.payload ?? 0);
    }),
});
export const { notificationRead } = slice.actions;
export default slice.reducer;
