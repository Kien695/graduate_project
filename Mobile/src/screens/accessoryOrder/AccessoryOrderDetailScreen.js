import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  cancelAccessoryOrder,
  getAccessoryOrderById,
} from "../../api/accessoryOrder.api";
import StatusBadge from "../../components/order/StatusBadge";
import PrimaryButton from "../../components/common/PrimaryButton";
import { formatVND } from "../../utils/format";
import { useTheme } from "../../hooks/useTheme";

export default function AccessoryOrderDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const fetchOrder = useCallback(async () => {
    setError("");
    try {
      setOrder(await getAccessoryOrderById(orderId));
    } catch (requestError) {
      setError(
        requestError.response?.status === 404
          ? "Đơn hàng không còn tồn tại."
          : "Không thể tải thông tin đơn hàng.",
      );
    }
  }, [orderId]);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrder().finally(() => setLoading(false));
    }, [fetchOrder]),
  );
  const canCancel = order?.status === "PENDING";
  const cancel = () => {
    Alert.alert(
      "Hủy đặt hàng",
      "Bạn có chắc chắn muốn hủy đơn hàng phụ kiện này?",
      [
        { text: "Đóng", style: "cancel" },
        {
          text: "Hủy đơn",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelAccessoryOrder(orderId);
              await fetchOrder();
              Alert.alert("Đã hủy", "Đơn hàng phụ kiện đã được hủy.");
            } catch (requestError) {
              Alert.alert(
                "Không thể hủy",
                requestError.response?.data?.message ||
                  "Đơn hàng đã được xử lý nên không thể hủy.",
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  if (!order)
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
  const imageUrl = order.images?.[0]?.url;
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
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <View style={styles.headerButton} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.codeRow}>
            <Text style={styles.code}>
              #PK{String(order.id).padStart(6, "0")}
            </Text>
            <StatusBadge status={order.status} />
          </View>
          <View style={styles.productCard}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.placeholder]}>
                <Ionicons
                  name="construct-outline"
                  size={34}
                  color="#555D6E"
                />
              </View>
            )}
            <View style={styles.productBody}>
              <Text style={styles.name} numberOfLines={2}>
                {order.accessory_name}
              </Text>
              <Text style={styles.unitPrice}>
                {formatVND(order.price)} / sản phẩm
              </Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          <View style={styles.card}>
            <InfoRow
              icon="cube-outline"
              label="Số lượng"
              value={`${order.quantity ?? 1}`}
              colors={colors}
            />
            <InfoRow
              icon="cash-outline"
              label="Tổng tiền"
              value={formatVND(order.total_amount)}
              colors={colors}
            />
            <InfoRow
              icon="calendar-outline"
              label="Ngày đặt"
              value={
                order.created_at
                  ? new Date(order.created_at).toLocaleString("vi-VN")
                  : "—"
              }
              colors={colors}
              last
            />
          </View>
          {!canCancel && (
            <View style={styles.notice}>
              <Ionicons
                name="information-circle-outline"
                size={21}
                color={colors.warning}
              />
              <Text style={styles.noticeText}>
                Đơn hàng đã được xử lý nên không thể hủy. Liên hệ Auto Dealer
                nếu bạn cần hỗ trợ thêm.
              </Text>
            </View>
          )}
        </ScrollView>
        {canCancel && (
          <View style={styles.footer}>
            <PrimaryButton
              title="Hủy đặt hàng"
              loading={cancelling}
              onPress={cancel}
            />
          </View>
        )}
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
    codeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
    },
    code: { color: colors.text, fontSize: 18, fontWeight: "900" },
    productCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginTop: 16,
    },
    image: {
      width: 72,
      height: 72,
      borderRadius: 12,
      backgroundColor: colors.surfaceRaised,
    },
    placeholder: { alignItems: "center", justifyContent: "center" },
    productBody: { flex: 1, paddingLeft: 13 },
    name: { color: colors.text, fontSize: 15.5, fontWeight: "800" },
    unitPrice: { color: colors.price, fontSize: 13, marginTop: 6 },
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
    infoValue: { color: colors.text, fontSize: 13.5, fontWeight: "700" },
    notice: {
      flexDirection: "row",
      backgroundColor: "#FFF8E6",
      borderWidth: 1,
      borderColor: "#F4D38A",
      borderRadius: 14,
      padding: 14,
      marginTop: 20,
    },
    noticeText: {
      flex: 1,
      color: "#7A5A12",
      fontSize: 12.5,
      lineHeight: 19,
      marginLeft: 9,
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
