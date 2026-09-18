import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { toggleTheme } from '../../store/slices/themeSlice';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle() {
  const dispatch = useDispatch();
  const { isDark, colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <TouchableOpacity style={styles.button} onPress={() => dispatch(toggleTheme())}>
      <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={20} color={isDark ? colors.warning : colors.text} />
    </TouchableOpacity>
  );
}

const getStyles = (colors) => StyleSheet.create({
  button: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
});
