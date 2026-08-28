// src/components/order/OrderCard.js
import { View, Text, StyleSheet } from 'react-native';
import { formatVND } from '../../utils/format';
import { COLORS } from '../../utils/theme';

const STATUS_LABEL = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  completed: 'Hoàn tất',
};
const STATUS_COLOR = {
  pending: '#E8A33D',
  confirmed: '#4CAF93',
  cancelled: '#E8776B',
  completed: '#7BA3E8',
};

export default function OrderCard({ order }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{order.brand} {order.model}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[order.status] || '#555' }]}>
          <Text style={styles.badgeText}>{STATUS_LABEL[order.status] || order.status}</Text>
        </View>
      </View>
      <Text style={styles.amount}>{formatVND(order.total_amount)}</Text>
      {order.note ? <Text style={styles.note}>Ghi chú: {order.note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  amount: { color: COLORS.primary, fontSize: 14, marginTop: 8 },
  note: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
});
