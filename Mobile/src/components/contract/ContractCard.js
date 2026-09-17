import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatVND } from "../../utils/format";
import { SHADOW } from "../../utils/theme";
import { useTheme } from "../../hooks/useTheme";
import StatusBadge from "./StatusBadge";

export default function ContractCard({ contract, onPress }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const imageUrl = contract.images?.[0]?.url;
  const date = contract.created_at
    ? new Date(contract.created_at).toLocaleDateString("vi-VN")
    : "—";
  return (
    <TouchableOpacity
      style={[styles.card, SHADOW]}
      onPress={onPress}
      activeOpacity={0.84}
    >
      <View style={styles.header}>
        <Text style={styles.code}>
          {contract.contract_number ||
            `#HD${String(contract.id).padStart(6, "0")}`}
        </Text>
        <StatusBadge status={contract.status} />
      </View>
      <View style={styles.divider} />
      <View style={styles.product}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Ionicons name="car-sport-outline" size={30} color={colors.muted} />
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {contract.brand} {contract.model}
          </Text>
          <Text style={styles.date}>Ngày tạo: {date}</Text>
          <Text style={styles.price}>
            {formatVND(contract.total_amount || contract.vehicle_price)}
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
    code: {
      flex: 1,
      marginRight: 10,
      color: colors.text,
      fontSize: 14,
      fontWeight: "900",
    },
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
