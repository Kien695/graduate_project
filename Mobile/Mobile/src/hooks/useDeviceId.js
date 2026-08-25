// src/hooks/useDeviceId.js
import { useState, useEffect } from 'react';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

// Lấy id ổn định của thiết bị.
// Android: androidId. iOS: idForVendor. Nếu không có, tự sinh và lưu lại.
async function resolveDeviceId() {
  // 1. Đã lưu trước đó thì dùng lại
  const saved = await storage.get(STORAGE_KEYS.DEVICE_ID);
  if (saved) return saved;

  // 2. Thử lấy id do OS cấp
  let id = null;
  try {
    if (Platform.OS === 'android') {
      id = Application.getAndroidId();
    } else if (Platform.OS === 'ios') {
      id = await Application.getIosIdForVendorAsync();
    }
  } catch (e) {
    console.warn('resolveDeviceId error:', e);
  }

  // 3. Fallback: tự sinh chuỗi ngẫu nhiên
  if (!id) {
    id = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  await storage.set(STORAGE_KEYS.DEVICE_ID, id);
  return id;
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    resolveDeviceId().then(setDeviceId);
  }, []);

  return deviceId; // null trong lúc đang resolve, có giá trị sau đó
}

// Bản không-phải-hook để gọi trong axios interceptor / thunk
export { resolveDeviceId };