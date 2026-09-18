import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { SHADOW } from "../../utils/theme";
import { useTheme } from "../../hooks/useTheme";

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <TouchableOpacity
      style={[
        styles.button,
        SHADOW,
        (loading || disabled) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.84}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    button: {
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    disabled: { opacity: 0.55 },
    text: { color: colors.white, fontSize: 15, fontWeight: "800" },
  });
