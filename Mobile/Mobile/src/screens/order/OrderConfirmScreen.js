import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createOrder } from '../../api/order.api';
import OrderConfirmCard from '../../components/order/OrderConfirmCard';
import PrimaryButton from '../../components/common/PrimaryButton';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../utils/theme';

export default function OrderConfirmScreen({ route, navigation }) {
  const { vehicle } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const confirm = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await createOrder(vehicle.id);
      Alert.alert(
        'Đặt hàng thành công',
        'Đơn hàng đã được tạo. Nhân viên sẽ liên hệ để xác nhận.',
        Platform.OS === 'web'
          ? undefined
          : [{ text: 'Xem đơn hàng', onPress: () => navigation.replace('MyOrders') }],
      );
      if (Platform.OS === 'web') navigation.replace('MyOrders');
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message
        || (error.request
          ? 'Không kết nối được Backend. Hãy kiểm tra API URL và mạng.'
          : 'Không thể tạo đơn hàng.');
      setErrorMessage(message);
      if (status === 409) Alert.alert('Không thể đặt xe', message);
      else if (status === 404) Alert.alert('Không thể đặt hàng', message);
      else Alert.alert('Lỗi hệ thống', message);
    } finally {
      setLoading(false);
    }
  };

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={25} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận đặt hàng</Text><View style={styles.headerSpace} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Thông tin xe</Text><OrderConfirmCard vehicle={vehicle} />
        <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
        <View style={styles.customerCard}>
          <CustomerRow icon="person-outline" label="Họ và tên" value={user?.full_name || 'Chưa cập nhật'} />
          <CustomerRow icon="call-outline" label="Số điện thoại" value={user?.phone || 'Chưa cập nhật'} />
          <CustomerRow icon="mail-outline" label="Email" value={user?.email || 'Chưa cập nhật'} last />
        </View>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <View style={styles.notice}><Ionicons name="information-circle-outline" size={21} color={COLORS.warning} /><Text style={styles.noticeText}>Xe sẽ được chuyển sang trạng thái giữ chỗ sau khi đặt hàng. Nhân viên sẽ liên hệ để xác nhận đơn.</Text></View>
      </ScrollView>
      <View style={styles.footer}><PrimaryButton title="Xác nhận đặt hàng" loading={loading} onPress={confirm} /></View>
    </View>
  </SafeAreaView>;
}

function CustomerRow({ icon, label, value, last }) {
  return <View style={[styles.customerRow, last && styles.last]}><View style={styles.labelWrap}><Ionicons name={icon} size={18} color={COLORS.muted} /><Text style={styles.label}>{label}</Text></View><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background }, screen: { flex: 1, backgroundColor: COLORS.background },
  header: { height: 58, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  headerSpace: { width: 42 }, headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  content: { padding: 16, paddingTop: 2, paddingBottom: 28 }, sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 12, marginTop: 18 },
  customerCard: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 15 },
  customerRow: { minHeight: 58, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  last: { borderBottomWidth: 0 }, labelWrap: { flexDirection: 'row', alignItems: 'center' }, label: { color: COLORS.muted, fontSize: 13, marginLeft: 9 },
  value: { color: COLORS.text, fontSize: 13, fontWeight: '700', maxWidth: '56%', textAlign: 'right' }, error: { color: COLORS.price, fontSize: 13, lineHeight: 19, marginTop: 14 },
  notice: { flexDirection: 'row', backgroundColor: '#2D2516', borderWidth: 1, borderColor: '#4A3A1C', borderRadius: 14, padding: 14, marginTop: 18 },
  noticeText: { flex: 1, color: '#D8C28E', fontSize: 12.5, lineHeight: 19, marginLeft: 9 },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
});
