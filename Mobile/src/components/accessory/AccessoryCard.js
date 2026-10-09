import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatVND } from "../../utils/format";
import { SHADOW } from "../../utils/theme";
import { useTheme } from "../../hooks/useTheme";

export default function AccessoryCard({ accessory, onPress, variant = "list" }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const featured = variant === "featured";
  const imageUrl = accessory.images?.[0]?.url;
  const inStock = Number(accessory.stock) > 0;
  return (
    <TouchableOpacity
      style={[
        styles.card,
        featured ? styles.featuredCard : styles.listCard,
        SHADOW,
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={featured ? styles.featuredImage : styles.listImage}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            featured ? styles.featuredImage : styles.listImage,
            styles.placeholder,
          ]}
        >
          <Ionicons
            name="construct-outline"
            size={featured ? 44 : 30}
            color="#555D6E"
          />
        </View>
      )}
      <View style={[styles.body, !featured && styles.listBody]}>
        <Text style={styles.name} numberOfLines={1}>
          {accessory.name}
        </Text>
        <Text style={styles.price}>{formatVND(accessory.price)}</Text>
        <View style={styles.statusRow}>
          <View
            style={[styles.statusDot, !inStock && styles.statusDotOff]}
          />
          <Text style={[styles.status, !inStock && styles.statusOff]}>
            {inStock ? "Còn hàng" : "Hết hàng"}
          </Text>
        </View>
      </View>
      {!featured && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.muted}
          style={styles.arrow}
        />
      )}
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
      overflow: "hidden",
    },
    featuredCard: { width: 200, marginRight: 14, marginBottom: 8 },
    listCard: {
      minHeight: 124,
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
    },
    featuredImage: {
      width: "100%",
      height: 140,
      backgroundColor: colors.surfaceRaised,
    },
    listImage: {
      width: 112,
      height: 96,
      borderRadius: 12,
      backgroundColor: colors.surfaceRaised,
    },
    placeholder: { alignItems: "center", justifyContent: "center" },
    body: { padding: 15 },
    listBody: { flex: 1, paddingVertical: 4, paddingHorizontal: 13 },
    name: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
    },
    price: {
      color: colors.price,
      fontSize: 15,
      fontWeight: "800",
      marginTop: 7,
    },
    statusRow: { flexDirection: "row", alignItems: "center", marginTop: 7 },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.success,
      marginRight: 6,
    },
    statusDotOff: { backgroundColor: colors.muted },
    status: { color: colors.success, fontSize: 11.5, fontWeight: "600" },
    statusOff: { color: colors.muted },
    arrow: { marginRight: 2 },
  });
