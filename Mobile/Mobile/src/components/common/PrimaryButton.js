import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS, SHADOW } from '../../utils/theme';

export default function PrimaryButton({ title, onPress, loading = false, disabled = false, style }) {
  return <TouchableOpacity style={[styles.button, SHADOW, (loading || disabled) && styles.disabled, style]} onPress={onPress} disabled={loading || disabled} activeOpacity={0.84}>{loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.text}>{title}</Text>}</TouchableOpacity>;
}

const styles = StyleSheet.create({
  button: { height: 52, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 }, text: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
});
