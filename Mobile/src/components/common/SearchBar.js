import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';
import { COLORS } from '../../utils/theme';

export default function SearchBar({ value, onChangeText, placeholder = 'Tìm kiếm xe...' }) {
  return <View style={styles.container}><Ionicons name="search-outline" size={19} color={COLORS.muted} /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.muted} style={styles.input} returnKeyType="search" /></View>;
}

const styles = StyleSheet.create({
  container: { height: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14 },
  input: { flex: 1, color: COLORS.text, fontSize: 14, paddingHorizontal: 10, paddingVertical: 0 },
});
