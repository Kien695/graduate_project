// src/screens/vehicle/VehicleListScreen.js
import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { getAvailableVehicles } from '../../api/vehicle.api';
import VehicleCard from '../../components/vehicle/VehicleCard';
import { logout } from '../../store/slices/authSlice';

export default function VehicleListScreen({ navigation }) {
  const dispatch = useDispatch();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setError(null);
    try {
      const data = await getAvailableVehicles();
      setVehicles(data);
    } catch (e) {
      setError('Không thể tải danh sách xe.');
    }
  }, []);

  // Tự tải lại mỗi khi quay về màn này (ví dụ sau khi đặt xong 1 đơn,
  // xe vừa đặt sẽ chuyển sang 'reserved' và biến khỏi danh sách)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchVehicles().finally(() => setLoading(false));
    }, [fetchVehicles])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
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
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8A33D" />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {error || 'Hiện chưa có xe nào khả dụng.'}
          </Text>
        }
        renderItem={({ item }) => (
          <VehicleCard
            vehicle={item}
            onPress={() => navigation.navigate('CreateOrder', { vehicle: item })}
          />
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('MyOrders')}>
          <Text style={styles.link}>Đơn hàng của tôi →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => dispatch(logout())}>
          <Text style={styles.logout}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12151C' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#12151C' },
  list: { padding: 16 },
  empty: { color: '#A9AEBA', textAlign: 'center', marginTop: 40 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 16, borderTopWidth: 1, borderTopColor: '#2A3142',
  },
  link: { color: '#E8A33D', fontSize: 14, fontWeight: '600' },
  logout: { color: '#E8776B', fontSize: 14, fontWeight: '600' },
});