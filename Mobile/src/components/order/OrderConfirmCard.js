import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";
import { formatVND } from "../../utils/format";
import { SHADOW } from "../../utils/theme";
import { useTheme } from "../../hooks/useTheme";

export default function OrderConfirmCard({ vehicle }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const imageUrl = vehicle.images?.[0]?.url;
  return (
    <View style={[styles.card, SHADOW]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Ionicons name="car-sport-outline" size={42} color="#555D6E" />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name}>
          {vehicle.brand} {vehicle.model}
        </Text>
        <Text style={styles.meta}>
          {vehicle.year || vehicle.manufacture_year} ·{" "}
          {vehicle.color || "Đang cập nhật"}
        </Text>
        <Text style={styles.price}>{formatVND(vehicle.price)}</Text>
        <View style={styles.available}>
          <View style={styles.dot} />
          <Text style={styles.availableText}>Còn hàng</Text>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    image: {
      width: "100%",
      height: 190,
      backgroundColor: colors.surfaceRaised,
    },
    placeholder: { alignItems: "center", justifyContent: "center" },
    body: { padding: 16 },
    name: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "900",
      textTransform: "capitalize",
    },
    meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
    price: {
      color: colors.price,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 9,
    },
    available: { flexDirection: "row", alignItems: "center", marginTop: 10 },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.success,
      marginRight: 6,
    },
    availableText: { color: colors.success, fontSize: 12, fontWeight: "700" },
  });
