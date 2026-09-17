// src/screens/order/CreateOrderScreen.js
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { createOrder } from "../../api/order.api";
import { formatVND } from "../../utils/format";
import { useTheme } from "../../hooks/useTheme";

export default function CreateOrderScreen({ route, navigation }) {
  const { vehicle } = route.params;
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await createOrder({ vehicleId: vehicle.id, note });
      Alert.alert(
        "Thành công",
        "Đặt xe thành công. Nhân viên sẽ liên hệ để xác nhận.",
        [{ text: "OK", onPress: () => navigation.navigate("MyOrders") }],
      );
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 409) {
        Alert.alert(
          "Không thể đặt xe",
          "Xe này vừa có người khác đặt trước. Vui lòng chọn xe khác.",
        );
        navigation.goBack();
      } else {
        Alert.alert("Lỗi", message || "Không thể đặt xe. Thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>
          {vehicle.brand} {vehicle.model}
        </Text>
        <Text style={styles.meta}>
          {vehicle.manufacture_year} · {vehicle.color}
        </Text>
        <Text style={styles.price}>{formatVND(vehicle.price)}</Text>
      </View>

      <Text style={styles.label}>Ghi chú (không bắt buộc)</Text>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="Ví dụ: muốn xem xe cuối tuần này"
        placeholderTextColor={colors.muted}
        multiline
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleConfirm}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Xác nhận đặt xe</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    name: { color: colors.text, fontSize: 18, fontWeight: "700" },
    meta: { color: colors.muted, fontSize: 13, marginTop: 4 },
    price: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "700",
      marginTop: 8,
    },
    label: { color: colors.muted, fontSize: 13, marginBottom: 8 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      color: colors.text,
      fontSize: 14,
      minHeight: 80,
      textAlignVertical: "top",
      borderWidth: 1,
      borderColor: colors.border,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 24,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  });
