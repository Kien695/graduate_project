import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAccessoryById } from "../../api/accessory.api";
import { createAccessoryOrder } from "../../api/accessoryOrder.api";
import VehicleImageGallery from "../../components/vehicle/VehicleImageGallery";
import PrimaryButton from "../../components/common/PrimaryButton";
import { formatVND } from "../../utils/format";
import { useTheme } from "../../hooks/useTheme";

export default function AccessoryDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { accessoryId } = route.params;
  const [accessory, setAccessory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError("");
      getAccessoryById(accessoryId)
        .then((data) => {
          if (active) {
            setAccessory(data);
            setQuantity(1);
          }
        })
        .catch((requestError) => {
          if (active)
            setError(
              requestError.response?.status === 404
                ? "Phụ kiện không còn tồn tại."
                : "Không thể tải thông tin phụ kiện.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [accessoryId]),
  );
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  if (!accessory)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <PrimaryButton
          title="Quay lại"
          onPress={() => navigation.goBack()}
          style={styles.retry}
        />
      </View>
    );
  const stock = Number(accessory.stock) || 0;
  const inStock = stock > 0;
  const decreaseQuantity = () =>
    setQuantity((value) => Math.max(1, value - 1));
  const increaseQuantity = () =>
    setQuantity((value) => Math.min(stock, value + 1));
  const placeOrder = async () => {
    setOrdering(true);
    try {
      const order = await createAccessoryOrder(accessory.id, quantity);
      Alert.alert("Đặt phụ kiện thành công", "Đơn hàng đã được tạo.", [
        {
          text: "Xem đơn hàng",
          onPress: () =>
            navigation.navigate("AccessoryOrderDetail", {
              orderId: order.id,
            }),
        },
      ]);
    } catch (requestError) {
      Alert.alert(
        "Không thể đặt hàng",
        requestError.response?.data?.message ||
          "Đã xảy ra lỗi, vui lòng thử lại.",
      );
    } finally {
      setOrdering(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={25} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết phụ kiện</Text>
          <View style={styles.headerButton} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <VehicleImageGallery images={accessory.images} />
          <View style={styles.titleRow}>
            <View style={styles.titleContent}>
              <Text style={styles.name}>{accessory.name}</Text>
              <Text style={styles.price}>{formatVND(accessory.price)}</Text>
            </View>
            <View
              style={[styles.stock, !inStock && styles.stockOff]}
            >
              <View
                style={[styles.stockDot, !inStock && styles.stockDotOff]}
              />
              <Text
                style={[styles.stockText, !inStock && styles.stockTextOff]}
              >
                {inStock ? "Còn hàng" : "Hết hàng"}
              </Text>
            </View>
          </View>
          {inStock && (
            <>
              <Text style={styles.sectionTitle}>Số lượng</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    quantity <= 1 && styles.quantityButtonDisabled,
                  ]}
                  onPress={decreaseQuantity}
                  disabled={quantity <= 1}
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    quantity >= stock && styles.quantityButtonDisabled,
                  ]}
                  onPress={increaseQuantity}
                  disabled={quantity >= stock}
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.quantityHint}>Tối đa {stock} sản phẩm</Text>
              </View>
            </>
          )}
          <Text style={styles.sectionTitle}>Thông tin phụ kiện</Text>
          <View style={styles.card}>
            {accessory.sku && (
              <InfoRow
                icon="pricetag-outline"
                label="Mã SKU"
                value={accessory.sku}
                colors={colors}
              />
            )}
            <InfoRow
              icon="cube-outline"
              label="Tồn kho"
              value={`${accessory.stock ?? 0}`}
              colors={colors}
              last
            />
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton
            title={
              inStock
                ? `Đặt phụ kiện · ${formatVND(accessory.price * quantity)}`
                : "Đặt phụ kiện"
            }
            loading={ordering}
            disabled={!inStock}
            onPress={placeOrder}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, last, colors }) {
  const styles = getStyles(colors);
  return (
    <View style={[styles.infoRow, last && styles.lastRow]}>
      <View style={styles.infoLabelWrap}>
        <View style={styles.infoIcon}>
          <Ionicons name={icon} size={17} color={colors.muted} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    screen: { flex: 1, backgroundColor: colors.background },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    header: {
      height: 58,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
    },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    content: { padding: 16, paddingTop: 4, paddingBottom: 28 },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginTop: 20,
    },
    titleContent: { flex: 1, paddingRight: 10 },
    name: {
      color: colors.text,
      fontSize: 22,
      lineHeight: 29,
      fontWeight: "900",
    },
    price: {
      color: colors.price,
      fontSize: 21,
      fontWeight: "900",
      marginTop: 7,
    },
    stock: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: "#EAF8F2",
      borderRadius: 12,
    },
    stockOff: { backgroundColor: "#F1F2F5" },
    stockDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.success,
      marginRight: 6,
    },
    stockDotOff: { backgroundColor: colors.muted },
    stockText: { color: "#16805B", fontSize: 11.5, fontWeight: "700" },
    stockTextOff: { color: colors.muted },
    quantityRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    quantityButton: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    quantityButtonDisabled: { opacity: 0.4 },
    quantityValue: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      marginHorizontal: 18,
      minWidth: 24,
      textAlign: "center",
    },
    quantityHint: {
      color: colors.muted,
      fontSize: 12,
      marginLeft: 14,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      marginTop: 26,
      marginBottom: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 15,
    },
    infoRow: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    lastRow: { borderBottomWidth: 0 },
    infoLabelWrap: { flexDirection: "row", alignItems: "center" },
    infoIcon: { width: 30, alignItems: "flex-start" },
    infoLabel: { color: colors.muted, fontSize: 13.5 },
    infoValue: {
      color: colors.text,
      fontSize: 13.5,
      fontWeight: "700",
      maxWidth: "52%",
      textAlign: "right",
    },
    footer: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
    },
    error: { color: colors.price, textAlign: "center", marginBottom: 18 },
    retry: { width: 160 },
  });
