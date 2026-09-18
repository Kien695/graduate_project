export const LIGHT_COLORS = {
  background: '#F5F7FA', surface: '#FFFFFF', surfaceRaised: '#EEF2F7',
  border: '#DCE2EA', text: '#172033', muted: '#667085',
  primary: '#E53935', primaryDark: '#C62828', price: '#FF4D49',
  success: '#38C98B', warning: '#F3B24C', white: '#FFFFFF',
};

export const DARK_COLORS = {
  background: '#0B0F17', surface: '#151A24', surfaceRaised: '#1C2230',
  border: '#293244', text: '#F1F5F9', muted: '#8A94A6',
  primary: '#E53935', primaryDark: '#C62828', price: '#FF6B62',
  success: '#38C98B', warning: '#F3B24C', white: '#FFFFFF',
};

// Giữ tên cũ để tương thích ngược cho tới khi tất cả file chuyển sang useTheme().
export const COLORS = LIGHT_COLORS;

export const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
};
