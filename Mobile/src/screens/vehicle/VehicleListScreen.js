import { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getVehicles } from "../../api/vehicle.api";
import VehicleCard from "../../components/vehicle/VehicleCard";
import SearchBar from "../../components/common/SearchBar";
import BottomNavigation from "../../components/common/BottomNavigation";
import { useTheme } from "../../hooks/useTheme";

export default function VehicleListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const fetchVehicles = useCallback(async () => {
    setError("");
    try {
      setVehicles(await getVehicles());
    } catch {
      setError("Không thể tải danh sách xe.");
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchVehicles().finally(() => setLoading(false));
    }, [fetchVehicles]),
  );
  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    return key
      ? vehicles.filter((item) =>
          `${item.brand} ${item.model} ${item.year} ${item.color}`
            .toLowerCase()
            .includes(key),
        )
      : vehicles;
  }, [search, vehicles]);
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Danh sách xe</Text>
          <TouchableOpacity style={styles.filter}>
            <Ionicons name="options-outline" size={21} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm kiếm xe..."
          />
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                {error || "Không tìm thấy xe phù hợp."}
              </Text>
            }
            renderItem={({ item }) => (
              <VehicleCard
                vehicle={item}
                onPress={() =>
                  navigation.navigate("VehicleDetail", { vehicleId: item.id })
                }
              />
            )}
          />
        )}
        <BottomNavigation navigation={navigation} active="home" />
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      height: 58,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    back: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    filter: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { color: colors.text, fontSize: 18, fontWeight: "800" },
    searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    list: { padding: 16, paddingTop: 4 },
    empty: { color: colors.muted, textAlign: "center", marginTop: 48 },
  });
