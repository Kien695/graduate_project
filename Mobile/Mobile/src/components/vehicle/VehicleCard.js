import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatVND } from '../../utils/format';
import { COLORS, SHADOW } from '../../utils/theme';

export default function VehicleCard({ vehicle, onPress, variant = 'list' }) {
  const [favorite, setFavorite] = useState(false);
  const featured = variant === 'featured';
  const imageUrl = vehicle.images?.[0]?.url;
  return <TouchableOpacity style={[styles.card, featured ? styles.featuredCard : styles.listCard, SHADOW]} onPress={onPress} activeOpacity={0.82}>
    {imageUrl ? <Image source={{ uri: imageUrl }} style={featured ? styles.featuredImage : styles.listImage} resizeMode="cover" /> : <View style={[featured ? styles.featuredImage : styles.listImage, styles.placeholder]}><Ionicons name="car-sport-outline" size={featured ? 44 : 30} color="#555D6E" /></View>}
    <View style={[styles.body, !featured && styles.listBody]}>
      <Text style={styles.name} numberOfLines={1}>{vehicle.brand} {vehicle.model}</Text>
      <Text style={styles.meta}>{vehicle.year} · {vehicle.color || 'Chưa cập nhật'}</Text>
      <Text style={styles.price}>{formatVND(vehicle.price)}</Text>
      <View style={styles.statusRow}><View style={styles.statusDot} /><Text style={styles.status}>{vehicle.status && String(vehicle.status).toLowerCase() !== 'available' ? 'Liên hệ' : 'Còn hàng'}</Text></View>
    </View>
    {featured ? <TouchableOpacity style={styles.favorite} onPress={() => setFavorite((value) => !value)}><Ionicons name={favorite ? 'heart' : 'heart-outline'} size={21} color={COLORS.primary} /></TouchableOpacity> : <Ionicons name="chevron-forward" size={20} color={COLORS.muted} style={styles.arrow} />}
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  featuredCard: { width: 270, marginRight: 14, marginBottom: 8 }, listCard: { minHeight: 124, marginBottom: 14, flexDirection: 'row', alignItems: 'center', padding: 12 },
  featuredImage: { width: '100%', height: 160, backgroundColor: COLORS.surfaceRaised }, listImage: { width: 112, height: 96, borderRadius: 12, backgroundColor: COLORS.surfaceRaised },
  placeholder: { alignItems: 'center', justifyContent: 'center' }, body: { padding: 15 }, listBody: { flex: 1, paddingVertical: 4, paddingHorizontal: 13 },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '800', textTransform: 'capitalize' }, meta: { color: COLORS.muted, fontSize: 12.5, marginTop: 5 },
  price: { color: COLORS.price, fontSize: 15, fontWeight: '800', marginTop: 7 }, statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 }, statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success, marginRight: 6 }, status: { color: COLORS.success, fontSize: 11.5, fontWeight: '600' },
  favorite: { position: 'absolute', right: 12, top: 12, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101219CC' }, arrow: { marginRight: 2 },
});
