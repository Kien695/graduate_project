// src/components/vehicle/VehicleCard.js
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatVND } from '../../utils/format';

export default function VehicleCard({ vehicle, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{vehicle.brand} {vehicle.model}</Text>
          <Text style={styles.meta}>
            {vehicle.manufacture_year} · {vehicle.color}
          </Text>
        </View>
        <Text style={styles.price}>{formatVND(vehicle.price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C212C',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A3142',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { color: '#F5F3EE', fontSize: 16, fontWeight: '700' },
  meta: { color: '#A9AEBA', fontSize: 13, marginTop: 4 },
  price: { color: '#E8A33D', fontSize: 15, fontWeight: '700' },
});