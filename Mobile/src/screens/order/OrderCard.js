// src/components/order/OrderCard.js
import { View, Text, StyleSheet } from "react-native";
import { formatVND } from "../../utils/format";
import { useTheme } from "../../hooks/useTheme";

const STATUS_LABEL = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  cancelled: "Đã hủy",
  completed: "Hoàn tất",
};
const STATUS_COLOR = {
  pending: "#E8A33D",
  confirmed: "#4CAF93",
  cancelled: "#E8776B",
  completed: "#7BA3E8",
};

export default function OrderCard({ order }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>
          {order.brand} {order.model}
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: STATUS_COLOR[order.status] || "#555" },
          ]}
        >
          <Text style={styles.badgeText}>
            {STATUS_LABEL[order.status] || order.status}
          </Text>
        </View>
      </View>
      <Text style={styles.amount}>{formatVND(order.total_amount)}</Text>
      {order.note ? (
        <Text style={styles.note}>Ghi chú: {order.note}</Text>
      ) : null}
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    name: { color: colors.text, fontSize: 15, fontWeight: "700" },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { color: colors.text, fontSize: 11, fontWeight: "700" },
    amount: { color: colors.primary, fontSize: 14, marginTop: 8 },
    note: { color: colors.muted, fontSize: 12, marginTop: 4 },
  });
