import { STORAGE_KEYS } from './constants';

const webStorage = () => {
  if (!globalThis.localStorage) throw new Error('Web storage is unavailable');
  return globalThis.localStorage;
};

export const storage = {
  async get(key) {
    return webStorage().getItem(key);
  },
  async set(key, value) {
    webStorage().setItem(key, String(value));
  },
  async remove(key) {
    webStorage().removeItem(key);
  },
  async getObject(key) {
    const raw = await this.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  async setObject(key, object) {
    await this.set(key, JSON.stringify(object));
  },
  async clearAuth() {
    await Promise.all([
      this.remove(STORAGE_KEYS.ACCESS_TOKEN),
      this.remove(STORAGE_KEYS.REFRESH_TOKEN),
      this.remove(STORAGE_KEYS.CURRENT_USER),
    ]);
  },
};
