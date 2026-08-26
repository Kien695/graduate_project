import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/theme';

export default function CategoryItem({ icon, label, onPress }) {
  return <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.75}><View style={styles.icon}><Ionicons name={icon} size={22} color={COLORS.primary} /></View><Text style={styles.label}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center' }, icon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#25191C', borderWidth: 1, borderColor: '#432326', alignItems: 'center', justifyContent: 'center' },
  label: { color: COLORS.text, fontSize: 12, fontWeight: '600', marginTop: 9 },
});
