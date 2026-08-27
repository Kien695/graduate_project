import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../utils/theme';

const config = {
  NOT_STARTED: { label: 'Chưa kiểm định', color: COLORS.muted, background: COLORS.surfaceRaised },
  PENDING: { label: 'Đang chờ kiểm định', color: '#B7791F', background: '#FFF8E6' },
  CHECKING: { label: 'Đang kiểm định', color: '#2B6CB0', background: '#EBF4FF' },
  PASS: { label: 'Đã đạt', color: '#16805B', background: '#EAF8F2' },
  FAIL: { label: 'Không đạt', color: '#C53030', background: '#FFF0F0' },
};
export default function InspectionStatusBadge({ status }) {
  const value = config[String(status || '').toUpperCase()] || config.NOT_STARTED;
  return <View style={[styles.badge, { backgroundColor: value.background }]}><View style={[styles.dot, { backgroundColor: value.color }]} /><Text style={[styles.text, { color: value.color }]}>{value.label}</Text></View>;
}
const styles = StyleSheet.create({ badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 13 }, dot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 }, text: { fontSize: 12, fontWeight: '800' } });
