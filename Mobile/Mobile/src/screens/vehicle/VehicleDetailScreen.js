import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getVehicleById } from '../../api/vehicle.api';
import VehicleImageGallery from '../../components/vehicle/VehicleImageGallery';
import PrimaryButton from '../../components/common/PrimaryButton';
import { formatVND } from '../../utils/format';
import { COLORS } from '../../utils/theme';

export default function VehicleDetailScreen({ route, navigation }) {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [favorite, setFavorite] = useState(false);
  useFocusEffect(useCallback(() => { let active = true; setLoading(true); setError(''); getVehicleById(vehicleId).then((data) => { if (active) setVehicle(data); }).catch((requestError) => { if (active) setError(requestError.response?.status === 404 ? 'Xe không còn tồn tại.' : 'Không thể tải thông tin xe.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [vehicleId]));
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!vehicle) return <View style={styles.center}><Text style={styles.error}>{error}</Text><PrimaryButton title="Quay lại" onPress={() => navigation.goBack()} style={styles.retry} /></View>;
  const order = () => navigation.navigate('OrderConfirm', { vehicle });
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.screen}>
    <View style={styles.header}><TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={25} color={COLORS.text} /></TouchableOpacity><Text style={styles.headerTitle}>Chi tiết xe</Text><TouchableOpacity style={styles.headerButton} onPress={() => setFavorite((value) => !value)}><Ionicons name={favorite ? 'heart' : 'heart-outline'} size={23} color={COLORS.primary} /></TouchableOpacity></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <VehicleImageGallery images={vehicle.images} />
      <View style={styles.titleRow}><View style={styles.titleContent}><Text style={styles.name}>{vehicle.brand} {vehicle.model}</Text><Text style={styles.price}>{formatVND(vehicle.price)}</Text></View><View style={styles.stock}><View style={styles.stockDot} /><Text style={styles.stockText}>{String(vehicle.status || '').toLowerCase() === 'available' || !vehicle.status ? 'Còn hàng' : 'Liên hệ'}</Text></View></View>
      <Text style={styles.sectionTitle}>Thông tin xe</Text><View style={styles.card}><InfoRow icon="business-outline" label="Hãng xe" value={vehicle.brand} /><InfoRow icon="car-outline" label="Dòng xe" value={vehicle.model} /><InfoRow icon="calendar-outline" label="Năm sản xuất" value={vehicle.year} /><InfoRow icon="color-palette-outline" label="Màu" value={vehicle.color || 'Đang cập nhật'} /><InfoRow icon="water-outline" label="Nhiên liệu" value={vehicle.fuel_type || 'Đang cập nhật'} /><InfoRow icon="settings-outline" label="Hộp số" value={vehicle.transmission || 'Đang cập nhật'} last /></View>
      <Text style={styles.sectionTitle}>Mô tả</Text><View style={styles.descriptionCard}><Text style={styles.description}>{vehicle.description || 'Mẫu xe đang được cập nhật thông tin chi tiết. Liên hệ Auto Dealer để được tư vấn về tình trạng xe, chính sách bảo hành và lịch xem xe.'}</Text></View>
    </ScrollView><View style={styles.footer}><PrimaryButton title="Đặt hàng" onPress={order} /></View>
  </View></SafeAreaView>;
}

function InfoRow({ icon, label, value, last }) { return <View style={[styles.infoRow, last && styles.lastRow]}><View style={styles.infoLabelWrap}><View style={styles.infoIcon}><Ionicons name={icon} size={17} color={COLORS.muted} /></View><Text style={styles.infoLabel}>{label}</Text></View><Text style={styles.infoValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background }, screen: { flex: 1, backgroundColor: COLORS.background }, center: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }, headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' }, headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4, paddingBottom: 28 }, titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20 }, titleContent: { flex: 1, paddingRight: 10 }, name: { color: COLORS.text, fontSize: 24, lineHeight: 31, fontWeight: '900', textTransform: 'capitalize' }, price: { color: COLORS.price, fontSize: 21, fontWeight: '900', marginTop: 7 },
  stock: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#13271F', borderRadius: 12 }, stockDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 6 }, stockText: { color: COLORS.success, fontSize: 11.5, fontWeight: '700' },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginTop: 26, marginBottom: 12 }, card: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 15 },
  infoRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border }, lastRow: { borderBottomWidth: 0 }, infoLabelWrap: { flexDirection: 'row', alignItems: 'center' }, infoIcon: { width: 30, alignItems: 'flex-start' }, infoLabel: { color: COLORS.muted, fontSize: 13.5 }, infoValue: { color: COLORS.text, fontSize: 13.5, fontWeight: '700', maxWidth: '52%', textAlign: 'right', textTransform: 'capitalize' },
  descriptionCard: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16 }, description: { color: '#C3C7D1', fontSize: 13.5, lineHeight: 21 },
  footer: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }, error: { color: COLORS.price, textAlign: 'center', marginBottom: 18 }, retry: { width: 160 },
});
