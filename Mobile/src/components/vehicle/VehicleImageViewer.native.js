import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ImageView from "react-native-image-viewing";
import { useTheme } from "../../hooks/useTheme";

export default function VehicleImageViewer({
  images,
  imageIndex,
  visible,
  onRequestClose,
  onImageIndexChange,
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <ImageView
      images={images}
      imageIndex={imageIndex}
      visible={visible}
      onRequestClose={onRequestClose}
      onImageIndexChange={onImageIndexChange}
      presentationStyle="overFullScreen"
      backgroundColor="#050609"
      swipeToCloseEnabled
      doubleTapToZoomEnabled
      HeaderComponent={({ imageIndex: currentIndex }) => (
        <View style={styles.header}>
          <TouchableOpacity style={styles.close} onPress={onRequestClose}>
            <Ionicons name="close" color={colors.white} size={27} />
          </TouchableOpacity>
          <Text style={styles.count}>
            {currentIndex + 1}/{images.length}
          </Text>
        </View>
      )}
    />
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    header: {
      position: "absolute",
      zIndex: 2,
      top: 42,
      left: 18,
      right: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    close: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "#171A22CC",
      alignItems: "center",
      justifyContent: "center",
    },
    count: {
      color: colors.white,
      backgroundColor: "#171A22CC",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 14,
      fontWeight: "700",
    },
  });
