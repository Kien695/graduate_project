// src/screens/order/CreateOrderScreen.js
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { createOrder } from '../../api/order.api';
import { formatVND } from '../../utils/format';

export default function CreateOrderScreen({ route, navigation }) {
  const { vehicle } = route.params;
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await createOrder({ vehicleId: vehicle.id, note });
      Alert.alert('Thành công', 'Đặt xe thành công. Nhân viên sẽ liên hệ để xác nhận.', [
        { text: 'OK', onPress: () => navigation.navigate('MyOrders') },
      ]);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 409) {
        Alert.alert('Không thể đặt xe', 'Xe này vừa có người khác đặt trước. Vui lòng chọn xe khác.');
        navigation.goBack();
      } else {
        Alert.alert('Lỗi', message || 'Không thể đặt xe. Thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{vehicle.brand} {vehicle.model}</Text>
        <Text style={styles.meta}>{vehicle.manufacture_year} · {vehicle.color}</Text>
        <Text style={styles.price}>{formatVND(vehicle.price)}</Text>
      </View>

      <Text style={styles.label}>Ghi chú (không bắt buộc)</Text>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="Ví dụ: muốn xem xe cuối tuần này"
        placeholderTextColor="#6B7080"
        multiline
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleConfirm}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#12151C" />
          : <Text style={styles.buttonText}>Xác nhận đặt xe</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12151C', padding: 16 },
  card: {
    backgroundColor: '#1C212C', borderRadius: 10, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: '#2A3142',
  },
  name: { color: '#F5F3EE', fontSize: 18, fontWeight: '700' },
  meta: { color: '#A9AEBA', fontSize: 13, marginTop: 4 },
  price: { color: '#E8A33D', fontSize: 16, fontWeight: '700', marginTop: 8 },
  label: { color: '#A9AEBA', fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: '#1C212C', borderRadius: 8, padding: 12,
    color: '#F5F3EE', fontSize: 14, minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#2A3142',
  },
  button: {
    backgroundColor: '#E8A33D', borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#12151C', fontSize: 15, fontWeight: '700' },
});