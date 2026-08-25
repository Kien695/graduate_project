// src/screens/order/MyOrdersScreen.js
import { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMyOrders } from '../../api/order.api';
import OrderCard from '../../components/order/OrderCard';

export default function MyOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch (e) {
      // im lặng, chỉ hiện danh sách rỗng — không cần Alert gây phiền
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders().finally(() => setLoading(false));
    }, [fetchOrders])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E8A33D" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={orders}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8A33D" />
      }
      ListEmptyComponent={<Text style={styles.empty}>Bạn chưa có đơn hàng nào.</Text>}
      renderItem={({ item }) => <OrderCard order={item} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12151C' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#12151C' },
  list: { padding: 16 },
  empty: { color: '#A9AEBA', textAlign: 'center', marginTop: 40 },
});