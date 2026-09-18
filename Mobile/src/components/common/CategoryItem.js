import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

export default function CategoryItem({ icon, label, onPress }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.icon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    item: { flex: 1, alignItems: "center" },
    icon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: "#FFF1F0",
      borderWidth: 1,
      borderColor: "#FFD5D2",
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 9,
    },
  });
