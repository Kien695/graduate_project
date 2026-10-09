import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMyOrders } from "../../api/order.api";
import { getMyAccessoryOrders } from "../../api/accessoryOrder.api";
import OrderCard from "../../components/order/OrderCard";
import AccessoryOrderCard from "../../components/accessoryOrder/AccessoryOrderCard";
import BottomNavigation from "../../components/common/BottomNavigation";
import { useTheme } from "../../hooks/useTheme";

export default function MyOrdersScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [vehicleOrders, setVehicleOrders] = useState([]);
  const [accessoryOrders, setAccessoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const fetchOrders = useCallback(async () => {
    setError("");
    try {
      const [vehicles, accessories] = await Promise.all([
        getMyOrders(),
        getMyAccessoryOrders().catch(() => []),
      ]);
      setVehicleOrders(vehicles);
      setAccessoryOrders(accessories);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Không thể tải đơn hàng.",
      );
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders().finally(() => setLoading(false));
    }, [fetchOrders]),
  );
  const refresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };
  // Gộp 2 loại đơn (xe + phụ kiện) thành một danh sách duy nhất, sắp xếp
  // theo ngày đặt mới nhất trước, để khách hàng theo dõi tất cả đơn ở cùng một nơi.
  const orders = useMemo(() => {
    const vehicles = vehicleOrders.map((item) => ({
      ...item,
      type: "vehicle",
      sortDate: item.order_date,
    }));
    const accessories = accessoryOrders.map((item) => ({
      ...item,
      type: "accessory",
      sortDate: item.created_at,
    }));
    return [...vehicles, ...accessories].sort(
      (a, b) => new Date(b.sortDate) - new Date(a.sortDate),
    );
  }, [vehicleOrders, accessoryOrders]);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Đơn hàng của tôi</Text>
          <Text style={styles.subtitle}>
            Theo dõi trạng thái đơn đặt xe và đơn hàng phụ kiện
          </Text>
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  {error || "Bạn chưa có đơn hàng nào"}
                </Text>
                <Text style={styles.emptyText}>
                  Các xe và phụ kiện bạn đặt sẽ hiển thị tại đây.
                </Text>
              </View>
            }
            renderItem={({ item }) =>
              item.type === "vehicle" ? (
                <OrderCard
                  order={item}
                  onPress={() =>
                    navigation.navigate("InspectionStatus", {
                      orderId: item.id,
                    })
                  }
                />
              ) : (
                <AccessoryOrderCard
                  order={item}
                  onPress={() =>
                    navigation.navigate("AccessoryOrderDetail", {
                      orderId: item.id,
                    })
                  }
                />
              )
            }
          />
        )}
        <BottomNavigation navigation={navigation} active="orders" />
      </View>
    </SafeAreaView>
  );
}
const getStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    screen: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },
    title: { color: colors.text, fontSize: 23, fontWeight: "900" },
    subtitle: { color: colors.muted, fontSize: 12.5, marginTop: 5 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: 16, paddingTop: 2, flexGrow: 1 },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 100,
    },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
    emptyText: { color: colors.muted, fontSize: 13, marginTop: 7 },
  });
