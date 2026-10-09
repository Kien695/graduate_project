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
import { getAccessories } from "../../api/accessory.api";
import AccessoryCard from "../../components/accessory/AccessoryCard";
import SearchBar from "../../components/common/SearchBar";
import BottomNavigation from "../../components/common/BottomNavigation";
import { useTheme } from "../../hooks/useTheme";

export default function AccessoryListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [accessories, setAccessories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const fetchAccessories = useCallback(async () => {
    setError("");
    try {
      setAccessories(await getAccessories());
    } catch {
      setError("Không thể tải danh sách phụ kiện.");
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAccessories().finally(() => setLoading(false));
    }, [fetchAccessories]),
  );
  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    return key
      ? accessories.filter((item) => item.name?.toLowerCase().includes(key))
      : accessories;
  }, [search, accessories]);
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAccessories();
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
          <Text style={styles.title}>Phụ kiện</Text>
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.navigate("MyOrders")}
          >
            <Ionicons name="receipt-outline" size={21} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm kiếm phụ kiện..."
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
                {error || "Không tìm thấy phụ kiện phù hợp."}
              </Text>
            }
            renderItem={({ item }) => (
              <AccessoryCard
                accessory={item}
                onPress={() =>
                  navigation.navigate("AccessoryDetail", {
                    accessoryId: item.id,
                  })
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
    title: { color: colors.text, fontSize: 18, fontWeight: "800" },
    searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    list: { padding: 16, paddingTop: 4 },
    empty: { color: colors.muted, textAlign: "center", marginTop: 48 },
  });
