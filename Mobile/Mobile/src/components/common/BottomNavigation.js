import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/theme';

const items = [
  { key: 'home', label: 'Trang chủ', icon: 'home-outline', activeIcon: 'home' },
  { key: 'orders', label: 'Đơn hàng', icon: 'receipt-outline', activeIcon: 'receipt' },
  { key: 'contracts', label: 'Hợp đồng', icon: 'document-text-outline', activeIcon: 'document-text' },
  { key: 'notifications', label: 'Thông báo', icon: 'notifications-outline', activeIcon: 'notifications' },
  { key: 'account', label: 'Tài khoản', icon: 'person-outline', activeIcon: 'person' },
];

export default function BottomNavigation({ navigation, active = 'home' }) {
  const navigate = (key) => {
    if (key === 'home') navigation.navigate('Home');
    else if (key === 'orders') navigation.navigate('MyOrders');
    else if (key === 'contracts') navigation.navigate('ContractList');
    else Alert.alert('Sắp ra mắt', 'Tính năng này đang được phát triển.');
  };
  return <View style={styles.bar}>{items.map((item) => { const selected = item.key === active; return <TouchableOpacity key={item.key} style={styles.item} onPress={() => navigate(item.key)}><Ionicons name={selected ? item.activeIcon : item.icon} size={21} color={selected ? COLORS.primary : COLORS.muted} /><Text style={[styles.label, selected && styles.active]} numberOfLines={1}>{item.label}</Text></TouchableOpacity>; })}</View>;
}

const styles = StyleSheet.create({
  bar: { height: 72, flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 9, paddingBottom: 7 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' }, label: { color: COLORS.muted, fontSize: 9.5, marginTop: 5 }, active: { color: COLORS.primary, fontWeight: '700' },
});
