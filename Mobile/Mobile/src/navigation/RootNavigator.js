// src/navigation/RootNavigator.js
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { restoreSession } from '../store/slices/authSlice';
import AuthStack from './AuthStack';
import AppStack from './AppStack';

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, restoring } = useAuth();

  // Khi mở app, thử khôi phục phiên đã lưu trong SecureStore
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  // Trong lúc kiểm tra phiên cũ → hiện loading, tránh nháy màn Login
  if (restoring) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E8A33D" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F1117' },
});
