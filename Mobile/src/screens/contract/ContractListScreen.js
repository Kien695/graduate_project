import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMyContracts } from "../../api/contract.api";
import BottomNavigation from "../../components/common/BottomNavigation";
import ContractCard from "../../components/contract/ContractCard";
import { useTheme } from "../../hooks/useTheme";

export default function ContractListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      setContracts(await getMyContracts());
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Không thể tải hợp đồng.",
      );
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );
  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Hợp đồng</Text>
          <Text style={styles.subtitle}>Quản lý hợp đồng mua xe của bạn</Text>
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={contracts}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  {error || "Bạn chưa có hợp đồng nào"}
                </Text>
                <Text style={styles.emptyText}>
                  Hợp đồng do nhân viên tạo sẽ hiển thị tại đây.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <ContractCard
                contract={item}
                onPress={() =>
                  navigation.navigate("ContractDetail", { contractId: item.id })
                }
              />
            )}
          />
        )}
        <BottomNavigation navigation={navigation} active="contracts" />
      </View>
    </SafeAreaView>
  );
}
const getStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    screen: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },
    title: { color: colors.text, fontSize: 23, fontWeight: "900" },
    subtitle: { color: colors.muted, fontSize: 12.5, marginTop: 5 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: 16, paddingTop: 2, flexGrow: 1 },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 100,
    },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
    emptyText: { color: colors.muted, fontSize: 13, marginTop: 7 },
  });
