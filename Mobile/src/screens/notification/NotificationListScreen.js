import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { getNotifications } from "../../api/notification.api";
import BottomNavigation from "../../components/common/BottomNavigation";
import { fetchUnreadCount } from "../../store/slices/notificationSlice";
import { SHADOW } from "../../utils/theme";
import { useTheme } from "../../hooks/useTheme";

export default function NotificationListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const dispatch = useDispatch();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      setItems(await getNotifications());
    } catch (e) {
      setError(e.response?.data?.message || "Không thể tải thông báo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
      dispatch(fetchUnreadCount());
    }, [load, dispatch]),
  );
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Thông báo</Text>
          <Text style={styles.subtitle}>
            Các cập nhật mới nhất dành cho bạn
          </Text>
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons
                  name="notifications-off-outline"
                  size={44}
                  color={colors.muted}
                />
                <Text style={styles.empty}>
                  {error || "Bạn chưa có thông báo nào."}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, SHADOW, !item.is_read && styles.unread]}
                onPress={() =>
                  navigation.navigate("NotificationDetail", {
                    notificationId: item.id,
                  })
                }
              >
                <View style={[styles.icon, !item.is_read && styles.unreadIcon]}>
                  <Ionicons
                    name={
                      item.is_read ? "notifications-outline" : "notifications"
                    }
                    size={21}
                    color={item.is_read ? colors.muted : colors.primary}
                  />
                </View>
                <View style={styles.body}>
                  <View style={styles.row}>
                    <Text
                      style={[
                        styles.itemTitle,
                        !item.is_read && styles.unreadTitle,
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {!item.is_read && <View style={styles.dot} />}
                  </View>
                  <Text style={styles.message} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text style={styles.date}>
                    {new Date(item.created_at).toLocaleString("vi-VN")}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
        <BottomNavigation navigation={navigation} active="notifications" />
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    screen: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
    title: { color: colors.text, fontSize: 26, fontWeight: "900" },
    subtitle: { color: colors.muted, fontSize: 13, marginTop: 5 },
    list: { padding: 16, paddingBottom: 24 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    empty: { color: colors.muted, textAlign: "center", marginTop: 12 },
    card: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      padding: 14,
      marginBottom: 11,
    },
    unread: { borderColor: "#FFD5D2", backgroundColor: "#FFF9F8" },
    icon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    unreadIcon: { backgroundColor: "#FFF0F0" },
    body: { flex: 1 },
    row: { flexDirection: "row", alignItems: "flex-start" },
    itemTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 14.5,
      fontWeight: "700",
      lineHeight: 20,
    },
    unreadTitle: { fontWeight: "900" },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginLeft: 8,
      marginTop: 5,
    },
    message: {
      color: colors.muted,
      fontSize: 12.5,
      lineHeight: 18,
      marginTop: 5,
    },
    date: { color: colors.muted, fontSize: 10.5, marginTop: 8 },
  });
