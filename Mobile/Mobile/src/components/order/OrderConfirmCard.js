import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { formatVND } from '../../utils/format';
import { COLORS, SHADOW } from '../../utils/theme';

export default function OrderConfirmCard({ vehicle }) {
  const imageUrl = vehicle.images?.[0]?.url;
  return <View style={[styles.card, SHADOW]}>{imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" /> : <View style={[styles.image, styles.placeholder]}><Ionicons name="car-sport-outline" size={42} color="#555D6E" /></View>}<View style={styles.body}><Text style={styles.name}>{vehicle.brand} {vehicle.model}</Text><Text style={styles.meta}>{vehicle.year || vehicle.manufacture_year} · {vehicle.color || 'Đang cập nhật'}</Text><Text style={styles.price}>{formatVND(vehicle.price)}</Text><View style={styles.available}><View style={styles.dot} /><Text style={styles.availableText}>Còn hàng</Text></View></View></View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }, image: { width: '100%', height: 190, backgroundColor: COLORS.surfaceRaised }, placeholder: { alignItems: 'center', justifyContent: 'center' }, body: { padding: 16 },
  name: { color: COLORS.text, fontSize: 19, fontWeight: '900', textTransform: 'capitalize' }, meta: { color: COLORS.muted, fontSize: 13, marginTop: 6 }, price: { color: COLORS.price, fontSize: 18, fontWeight: '900', marginTop: 9 }, available: { flexDirection: 'row', alignItems: 'center', marginTop: 10 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 6 }, availableText: { color: COLORS.success, fontSize: 12, fontWeight: '700' },
});
