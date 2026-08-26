// src/utils/storage.js
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from './constants';

// SecureStore chỉ lưu được chuỗi, nên object phải JSON.stringify.
export const storage = {
  async get(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('storage.get error:', key, e);
      return null;
    }
  },

  async set(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('storage.set error:', key, e);
      throw e;
    }
  },

  async remove(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('storage.remove error:', key, e);
    }
  },

  // Lưu/đọc object tiện lợi (dùng cho currentUser)
  async getObject(key) {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async setObject(key, obj) {
    await this.set(key, JSON.stringify(obj));
  },

  // Xóa sạch khi đăng xuất
  async clearAuth() {
    await Promise.all([
      this.remove(STORAGE_KEYS.ACCESS_TOKEN),
      this.remove(STORAGE_KEYS.REFRESH_TOKEN),
      this.remove(STORAGE_KEYS.CURRENT_USER),
    ]);
    // Lưu ý: KHÔNG xóa DEVICE_ID khi logout — thiết bị vẫn là thiết bị đó.
  },
};
