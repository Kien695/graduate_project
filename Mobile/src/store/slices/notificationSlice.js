// src/store/slices/notificationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getUnreadCount } from '../../api/notification.api';

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async () => {
    const data = await getUnreadCount();
    return data.count;
  },
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { unreadCount: 0 },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload;
    });
  },
});

export default notificationSlice.reducer;
