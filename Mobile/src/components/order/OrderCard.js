import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatVND } from "../../utils/format";
import { SHADOW } from "../../utils/theme";
import { useTheme } from "../../hooks/useTheme";
import StatusBadge from "./StatusBadge";

export default function OrderCard({ order, onPress }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const imageUrl = order.images?.[0]?.url;
  const date = order.order_date
    ? new Date(order.order_date).toLocaleDateString("vi-VN")
    : "—";
  return (
    <TouchableOpacity
      style={[styles.card, SHADOW]}
      onPress={onPress}
      activeOpacity={0.84}
    >
      <View style={styles.header}>
        <Text style={styles.code}>#DH{String(order.id).padStart(6, "0")}</Text>
        <StatusBadge status={order.status} />
      </View>
      <View style={styles.divider} />
      <View style={styles.product}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Ionicons name="car-outline" size={28} color="#555D6E" />
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {order.brand} {order.model}
          </Text>
          <Text style={styles.date}>Ngày đặt: {date}</Text>
          <Text style={styles.price}>
            {formatVND(order.total_amount || order.price)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      marginBottom: 14,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    code: { color: colors.text, fontSize: 14, fontWeight: "900" },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 13 },
    product: { flexDirection: "row", alignItems: "center" },
    image: {
      width: 76,
      height: 64,
      borderRadius: 11,
      backgroundColor: colors.surfaceRaised,
    },
    placeholder: { alignItems: "center", justifyContent: "center" },
    body: { flex: 1, paddingHorizontal: 12 },
    name: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
      textTransform: "capitalize",
    },
    date: { color: colors.muted, fontSize: 11.5, marginTop: 5 },
    price: {
      color: colors.price,
      fontSize: 13.5,
      fontWeight: "800",
      marginTop: 5,
    },
  });
