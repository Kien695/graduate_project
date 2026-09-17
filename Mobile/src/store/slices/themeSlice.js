// src/store/slices/themeSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storage } from '../../utils/storage';
import { STORAGE_KEYS } from '../../utils/constants';

// --- Nạp theme đã lưu khi mở app (giống restoreSession của auth) ---
export const loadTheme = createAsyncThunk('theme/load', async () => {
  const saved = await storage.get(STORAGE_KEYS.THEME);
  return saved === 'dark' ? 'dark' : 'light';
});

// --- Chuyển đổi sáng/tối, lưu lại để lần mở app sau vẫn giữ nguyên ---
export const toggleTheme = createAsyncThunk(
  'theme/toggle',
  async (_, { getState }) => {
    const next = getState().theme.mode === 'dark' ? 'light' : 'dark';
    await storage.set(STORAGE_KEYS.THEME, next);
    return next;
  },
);

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: 'light' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadTheme.fulfilled, (state, action) => { state.mode = action.payload; })
      .addCase(toggleTheme.fulfilled, (state, action) => { state.mode = action.payload; });
  },
});

export default themeSlice.reducer;
