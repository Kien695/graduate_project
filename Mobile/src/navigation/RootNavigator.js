// src/navigation/RootNavigator.js
import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { restoreSession } from "../store/slices/authSlice";
import { loadTheme } from "../store/slices/themeSlice";
import { fetchUnreadCount } from "../store/slices/notificationSlice";
import AuthStack from "./AuthStack";
import AppStack from "./AppStack";

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, restoring } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  // Nạp phiên đăng nhập cũ và theme đã lưu ngay khi mở app
  useEffect(() => {
    dispatch(restoreSession());
    dispatch(loadTheme());
  }, [dispatch]);

  // Có số thông báo chưa đọc ngay khi đã xác thực, không cần chờ vào Trang chủ
  useEffect(() => {
    if (isAuthenticated) dispatch(fetchUnreadCount());
  }, [isAuthenticated, dispatch]);

  if (restoring) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
  });
