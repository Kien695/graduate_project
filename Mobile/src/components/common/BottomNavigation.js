import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import { useTheme } from "../../hooks/useTheme";

const items = [
  { key: "home", label: "Trang chủ", icon: "home-outline", activeIcon: "home" },
  {
    key: "orders",
    label: "Đơn hàng",
    icon: "receipt-outline",
    activeIcon: "receipt",
  },
  {
    key: "contracts",
    label: "Hợp đồng",
    icon: "document-text-outline",
    activeIcon: "document-text",
  },
  {
    key: "notifications",
    label: "Thông báo",
    icon: "notifications-outline",
    activeIcon: "notifications",
  },
  {
    key: "account",
    label: "Tài khoản",
    icon: "person-outline",
    activeIcon: "person",
  },
];

export default function BottomNavigation({ navigation, active = "home" }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const unreadCount = useSelector((state) => state.notifications.unreadCount);
  const navigate = (key) => {
    if (key === "home") navigation.navigate("Home");
    else if (key === "orders") navigation.navigate("MyOrders");
    else if (key === "contracts") navigation.navigate("ContractList");
    else if (key === "notifications") navigation.navigate("NotificationList");
    else if (key === "account") navigation.navigate("Account");
  };
  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const selected = item.key === active;
        const showBadge = item.key === "notifications" && unreadCount > 0;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.item}
            onPress={() => navigate(item.key)}
          >
            <View>
              <Ionicons
                name={selected ? item.activeIcon : item.icon}
                size={21}
                color={selected ? colors.primary : colors.muted}
              />
              {showBadge && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.label, selected && styles.active]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    bar: {
      height: 72,
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 9,
      paddingBottom: 7,
    },
    item: { flex: 1, alignItems: "center", justifyContent: "center" },
    label: { color: colors.muted, fontSize: 9.5, marginTop: 5 },
    active: { color: colors.primary, fontWeight: "700" },
    tabBadge: {
      position: "absolute",
      right: -8,
      top: -4,
      minWidth: 15,
      height: 15,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    tabBadgeText: { color: colors.white, fontSize: 9, fontWeight: "800" },
  });
