import { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { getVehicles } from "../../api/vehicle.api";
import VehicleCard from "../../components/vehicle/VehicleCard";
import SearchBar from "../../components/common/SearchBar";
import CategoryItem from "../../components/common/CategoryItem";
import BottomNavigation from "../../components/common/BottomNavigation";
import PrimaryButton from "../../components/common/PrimaryButton";
import ThemeToggle from "../../components/common/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { fetchUnreadCount } from "../../store/slices/notificationSlice";
import { SHADOW } from "../../utils/theme";

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const dispatch = useDispatch();
  const unreadCount = useSelector((state) => state.notifications.unreadCount);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError("");
      getVehicles()
        .then((data) => {
          if (active) setVehicles(data);
        })
        .catch(() => {
          if (active) setError("Không thể tải danh sách xe.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      dispatch(fetchUnreadCount());
      return () => {
        active = false;
      };
    }, [dispatch]),
  );
  const featured = useMemo(() => {
    const key = search.trim().toLowerCase();
    return (
      key
        ? vehicles.filter((item) =>
            `${item.brand} ${item.model}`.toLowerCase().includes(key),
          )
        : vehicles
    ).slice(0, 5);
  }, [search, vehicles]);
  const comingSoon = () =>
    Alert.alert("Sắp ra mắt", "Danh mục này đang được phát triển.");
  const initial = (user?.full_name || "K").trim().charAt(0).toUpperCase();
  const bannerVehicle = vehicles[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.user}>
              {user?.avatar_url ? (
                <ImageBackground
                  source={{ uri: user.avatar_url }}
                  style={styles.avatar}
                  imageStyle={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              )}
              <View>
                <Text style={styles.greeting}>Xin chào,</Text>
                <Text style={styles.userName}>
                  {user?.full_name || "Khách hàng"}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <ThemeToggle />
              <TouchableOpacity
                style={styles.notification}
                onPress={() => navigation.navigate("NotificationList")}
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={colors.text}
                />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm kiếm xe, phụ kiện..."
          />

          <ImageBackground
            source={
              bannerVehicle?.images?.[0]?.url
                ? { uri: bannerVehicle.images[0].url }
                : undefined
            }
            style={[styles.banner, SHADOW]}
            imageStyle={styles.bannerImage}
          >
            <View style={styles.overlay} />
            <View style={styles.bannerContent}>
              <Text style={styles.promo}>ƯU ĐÃI THÁNG NÀY</Text>
              <Text style={styles.bannerTitle}>
                {bannerVehicle
                  ? `${bannerVehicle.brand} ${bannerVehicle.model}`
                  : "Khám phá xe mới"}
              </Text>
              <Text style={styles.bannerSub}>
                Ưu đãi dành riêng cho khách hàng Auto Dealer
              </Text>
              <PrimaryButton
                title="Xem ngay"
                style={styles.bannerButton}
                onPress={() =>
                  bannerVehicle
                    ? navigation.navigate("VehicleDetail", {
                        vehicleId: bannerVehicle.id,
                      })
                    : navigation.navigate("VehicleList")
                }
              />
            </View>
          </ImageBackground>

          <Text style={styles.sectionTitle}>Danh mục</Text>
          <View style={styles.categories}>
            <CategoryItem
              icon="car-sport-outline"
              label="Xe"
              onPress={() => navigation.navigate("VehicleList")}
            />
            <CategoryItem
              icon="construct-outline"
              label="Phụ kiện"
              onPress={comingSoon}
            />
            <CategoryItem
              icon="gift-outline"
              label="Ưu đãi"
              onPress={comingSoon}
            />
            <CategoryItem
              icon="shield-checkmark-outline"
              label="Dịch vụ"
              onPress={comingSoon}
            />
          </View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Xe nổi bật</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("VehicleList")}
            >
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : featured.length ? (
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <VehicleCard
                  variant="featured"
                  vehicle={item}
                  onPress={() =>
                    navigation.navigate("VehicleDetail", { vehicleId: item.id })
                  }
                />
              )}
            />
          ) : (
            <Text style={styles.empty}>Không tìm thấy xe phù hợp.</Text>
          )}
        </ScrollView>
        <BottomNavigation navigation={navigation} active="home" />
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 18, paddingBottom: 28 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    user: { flexDirection: "row", alignItems: "center" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      overflow: "hidden",
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderWidth: 2,
      borderColor: "#FF7773",
    },
    avatarImage: { borderRadius: 23 },
    avatarText: { color: colors.white, fontSize: 18, fontWeight: "800" },
    greeting: { color: colors.muted, fontSize: 12 },
    userName: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      marginTop: 2,
    },
    notification: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      right: -4,
      top: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    badgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
    banner: {
      height: 200,
      borderRadius: 18,
      overflow: "hidden",
      marginTop: 18,
      backgroundColor: colors.surfaceRaised,
    },
    bannerImage: { borderRadius: 18 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#080A0FA8" },
    bannerContent: {
      flex: 1,
      padding: 20,
      justifyContent: "center",
      maxWidth: "78%",
    },
    promo: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1,
    },
    bannerTitle: {
      color: colors.white,
      fontSize: 23,
      fontWeight: "900",
      textTransform: "capitalize",
      marginTop: 7,
    },
    bannerSub: {
      color: "#D1D4DC",
      fontSize: 12.5,
      lineHeight: 18,
      marginTop: 5,
    },
    bannerButton: { width: 116, height: 39, borderRadius: 11, marginTop: 14 },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      marginTop: 25,
      marginBottom: 14,
    },
    categories: { flexDirection: "row", gap: 8 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    seeAll: {
      color: colors.primary,
      fontSize: 12.5,
      fontWeight: "700",
      marginTop: 12,
    },
    loader: { marginVertical: 42 },
    error: { color: colors.price, marginVertical: 28 },
    empty: { color: colors.muted, marginVertical: 24 },
  });
