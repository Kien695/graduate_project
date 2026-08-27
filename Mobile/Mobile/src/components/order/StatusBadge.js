import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../utils/theme';

const config = {
  PENDING: { label: 'Chờ xác nhận', color: '#B7791F', background: '#FFF8E6' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#16805B', background: '#EAF8F2' },
  CANCELLED: { label: 'Đã hủy', color: '#C53030', background: '#FFF0F0' },
  COMPLETED: { label: 'Hoàn tất', color: '#2B6CB0', background: '#EBF4FF' },
};

export default function StatusBadge({ status }) {
  const key = String(status || '').toUpperCase();
  const value = config[key] || { label: key || 'Không xác định', color: COLORS.muted, background: COLORS.surfaceRaised };
  return <View style={[styles.badge, { backgroundColor: value.background }]}><View style={[styles.dot, { backgroundColor: value.color }]} /><Text style={[styles.text, { color: value.color }]}>{value.label}</Text></View>;
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 }, text: { fontSize: 11, fontWeight: '700' },
});
