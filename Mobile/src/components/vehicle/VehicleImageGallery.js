import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import VehicleImageViewer from "./VehicleImageViewer";

export default function VehicleImageGallery({ images = [] }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { width } = useWindowDimensions();
  const galleryWidth = width - 32;
  const sources = useMemo(
    () => images.filter((item) => item?.url).map((item) => ({ uri: item.url })),
    [images],
  );
  const [index, setIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);

  if (!sources.length)
    return (
      <View style={[styles.image, styles.placeholder, { width: galleryWidth }]}>
        <Ionicons name="car-sport-outline" size={64} color="#555D6E" />
        <Text style={styles.placeholderText}>Chưa có hình ảnh</Text>
      </View>
    );
  const openViewer = (selectedIndex) => {
    setIndex(selectedIndex);
    setViewerVisible(true);
  };

  return (
    <View>
      <FlatList
        horizontal
        pagingEnabled
        data={sources}
        keyExtractor={(item, itemIndex) => `${item.uri}-${itemIndex}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / galleryWidth))
        }
        renderItem={({ item, index: itemIndex }) => (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => openViewer(itemIndex)}
          >
            <Image
              source={item}
              style={[styles.image, { width: galleryWidth }]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      />
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {index + 1}/{sources.length}
        </Text>
      </View>
      <View style={styles.dots}>
        {sources.map((source, dotIndex) => (
          <View
            key={`${source.uri}-dot`}
            style={[styles.dot, dotIndex === index && styles.activeDot]}
          />
        ))}
      </View>
      <VehicleImageViewer
        images={sources}
        imageIndex={index}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        onImageIndexChange={setIndex}
      />
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    image: {
      height: 280,
      borderRadius: 18,
      backgroundColor: colors.surfaceRaised,
    },
    placeholder: { alignItems: "center", justifyContent: "center" },
    placeholderText: { color: colors.muted, marginTop: 10, fontSize: 13 },
    counter: {
      position: "absolute",
      right: 14,
      bottom: 22,
      backgroundColor: "#080A0FCC",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    counterText: { color: colors.white, fontSize: 12, fontWeight: "700" },
    dots: {
      position: "absolute",
      bottom: 10,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      gap: 5,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF55" },
    activeDot: { width: 18, backgroundColor: colors.primary },
  });
