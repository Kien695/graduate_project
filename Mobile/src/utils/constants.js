// src/utils/constants.js

// deviceType PHẢI khớp giá trị backend mong đợi để tính giới hạn thiết bị.
// Khách hàng: tối đa 2 phiên (1 desktop từ web + 1 mobile từ app này).
export const DEVICE_TYPE = 'MOBILE';

// Key lưu trong SecureStore — gom về 1 chỗ để không gõ nhầm chuỗi.
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  DEVICE_ID: 'deviceId',
  CURRENT_USER: 'currentUser',
  THEME: 'themeMode',
};
