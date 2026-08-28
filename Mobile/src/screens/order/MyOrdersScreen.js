import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyOrders } from '../../api/order.api';
import OrderCard from '../../components/order/OrderCard';
import BottomNavigation from '../../components/common/BottomNavigation';
import { COLORS } from '../../utils/theme';

export default function MyOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const fetchOrders = useCallback(async () => { setError(''); try { setOrders(await getMyOrders()); } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể tải đơn hàng.'); } }, []);
  useFocusEffect(useCallback(() => { setLoading(true); fetchOrders().finally(() => setLoading(false)); }, [fetchOrders]));
  const refresh = async () => { setRefreshing(true); await fetchOrders(); setRefreshing(false); };
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.screen}><View style={styles.header}><Text style={styles.title}>Đơn hàng của tôi</Text><Text style={styles.subtitle}>Theo dõi trạng thái đơn hàng và kiểm định xe</Text></View>{loading ? <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View> : <FlatList data={orders} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{error || 'Bạn chưa có đơn hàng nào'}</Text><Text style={styles.emptyText}>Các xe bạn đặt sẽ hiển thị tại đây.</Text></View>} renderItem={({ item }) => <OrderCard order={item} onPress={() => navigation.navigate('InspectionStatus', { orderId: item.id })} />} />}<BottomNavigation navigation={navigation} active="orders" /></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: COLORS.background }, screen: { flex: 1, backgroundColor: COLORS.background }, header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 }, title: { color: COLORS.text, fontSize: 23, fontWeight: '900' }, subtitle: { color: COLORS.muted, fontSize: 12.5, marginTop: 5 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { padding: 16, paddingTop: 2, flexGrow: 1 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 }, emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' }, emptyText: { color: COLORS.muted, fontSize: 13, marginTop: 7 } });
