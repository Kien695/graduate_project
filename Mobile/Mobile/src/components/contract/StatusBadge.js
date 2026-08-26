import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../utils/theme';

const config = {
  DRAFT: { label: 'Chờ duyệt', color: '#F3B24C', background: '#332715' },
  CREATED: { label: 'Đã tạo', color: '#F3B24C', background: '#332715' },
  APPROVED: { label: 'Chờ xác nhận', color: '#78A9FF', background: '#172844' },
  SIGNED: { label: 'Đã xác nhận', color: '#4CC9A0', background: '#123027' },
  COMPLETED: { label: 'Hoàn tất', color: '#4CC9A0', background: '#123027' },
  CANCELLED: { label: 'Đã hủy', color: '#FF716C', background: '#35191B' },
};
export default function StatusBadge({ status }) {
  const key = String(status || '').toUpperCase();
  const value = config[key] || { label: key || 'Không xác định', color: COLORS.muted, background: COLORS.surfaceRaised };
  return <View style={[styles.badge, { backgroundColor: value.background }]}><View style={[styles.dot, { backgroundColor: value.color }]} /><Text style={[styles.text, { color: value.color }]}>{value.label}</Text></View>;
}
const styles = StyleSheet.create({ badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }, dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 }, text: { fontSize: 11, fontWeight: '700' } });
