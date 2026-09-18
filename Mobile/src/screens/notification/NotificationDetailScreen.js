import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import {
  getNotification,
  markNotificationRead,
} from "../../api/notification.api";
import { fetchUnreadCount } from "../../store/slices/notificationSlice";
import { SHADOW } from "../../utils/theme";
import { useTheme } from "../../hooks/useTheme";

export default function NotificationDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const dispatch = useDispatch();
  const { notificationId } = route.params;
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const value = await getNotification(notificationId);
      if (value.is_read) {
        setItem(value);
        return;
      }
      setItem(await markNotificationRead(notificationId));
      dispatch(fetchUnreadCount());
    } catch (e) {
      setError(e.response?.data?.message || "Không thể tải thông báo.");
    }
  }, [notificationId, dispatch]);
  useEffect(() => {
    load();
  }, [load]);
  const openReference = () => {
    if (!item?.reference_id) return;
    if (item.type === "ORDER") navigation.navigate("MyOrders");
    else if (item.type === "CONTRACT")
      navigation.navigate("ContractDetail", { contractId: item.reference_id });
    else if (item.type === "INSPECTION")
      navigation.navigate("InspectionStatus", { orderId: item.reference_id });
    else navigation.navigate("Account");
  };
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết thông báo</Text>
        <View style={styles.back} />
      </View>
      {!item && !error ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={[styles.card, SHADOW]}>
            <View style={styles.icon}>
              <Ionicons name="notifications" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleString("vi-VN")}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.message}>{item.message}</Text>
            {item.reference_id ? (
              <TouchableOpacity style={styles.button} onPress={openReference}>
                <Text style={styles.buttonText}>Xem nội dung liên quan</Text>
                <Ionicons name="arrow-forward" size={19} color={colors.white} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      height: 60,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 15,
    },
    back: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { color: colors.text, fontSize: 17, fontWeight: "900" },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    error: { color: colors.primary, textAlign: "center" },
    content: { flex: 1, padding: 18 },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 20,
    },
    icon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: "#FFF0F0",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900",
      lineHeight: 29,
      marginTop: 16,
    },
    date: { color: colors.muted, fontSize: 12, marginTop: 8 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 19 },
    message: { color: colors.text, fontSize: 15, lineHeight: 23 },
    button: {
      minHeight: 48,
      borderRadius: 13,
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 24,
    },
    buttonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "800",
      marginRight: 8,
    },
  });
