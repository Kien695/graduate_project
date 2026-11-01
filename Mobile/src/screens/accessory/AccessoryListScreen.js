import { useCallback, useEffect, useRef, useState } from "react";
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
import { getAccessoryPage } from "../../api/accessory.api";
import AccessoryCard from "../../components/accessory/AccessoryCard";
import SearchBar from "../../components/common/SearchBar";
import BottomNavigation from "../../components/common/BottomNavigation";
import { useTheme } from "../../hooks/useTheme";

const PAGE_SIZE = 10;

export default function AccessoryListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [accessories, setAccessories] = useState([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const requestRef = useRef(0); // bỏ qua kết quả của yêu cầu cũ khi người dùng đã đổi từ khóa/làm mới

  // Tìm kiếm gửi lên máy chủ sau 400ms ngừng gõ, vì danh sách chỉ tải từng trang
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    async (page, keyword) => {
      const requestId = ++requestRef.current;
      try {
        const data = await getAccessoryPage({ page, limit: PAGE_SIZE, search: keyword });
        if (requestId !== requestRef.current) return;
        const items = data.items || [];
        setError("");
        setAccessories((current) => {
          if (page === 1) return items;
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...items.filter((item) => !seen.has(item.id))];
        });
        pageRef.current = page;
        setHasMore(
          Number.isFinite(data.total)
            ? page * PAGE_SIZE < data.total
            : items.length === PAGE_SIZE,
        );
      } catch {
        if (requestId !== requestRef.current) return;
        setError("Không thể tải danh sách phụ kiện.");
        if (page === 1) setAccessories([]);
        setHasMore(false);
      }
    },
    [],
  );

  // Tải trang đầu khi vào màn hình hoặc khi từ khóa đổi
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPage(1, query).finally(() => setLoading(false));
    }, [fetchPage, query]),
  );

  const loadMore = async () => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    setLoadingMore(true);
    await fetchPage(pageRef.current + 1, query);
    setLoadingMore(false);
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPage(1, query);
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
            data={accessories}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={styles.footer} color={colors.primary} />
              ) : error && accessories.length ? (
                <TouchableOpacity onPress={loadMore}>
                  <Text style={styles.empty}>{error} Chạm để thử lại.</Text>
                </TouchableOpacity>
              ) : null
            }
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
    footer: { paddingVertical: 20 },
  });
