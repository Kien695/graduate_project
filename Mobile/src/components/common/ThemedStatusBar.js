import { StatusBar } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function ThemedStatusBar() {
  const { isDark, colors } = useTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={colors.background}
    />
  );
}
