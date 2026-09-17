import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Tìm kiếm xe...",
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={19} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        returnKeyType="search"
      />
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      height: 48,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      paddingHorizontal: 10,
      paddingVertical: 0,
    },
  });
