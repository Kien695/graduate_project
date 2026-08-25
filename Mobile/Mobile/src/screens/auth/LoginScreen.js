// src/screens/auth/LoginScreen.js
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { login, clearError } from '../../store/slices/authSlice';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const dispatch = useDispatch();
  const { loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) return;
    dispatch(clearError());
    dispatch(login({ email: email.trim(), password }));
    // Không cần navigate — RootNavigator tự chuyển khi isAuthenticated đổi
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>Vào gara.</Text>
        <Text style={styles.brandSub}>Quản lý mua bán ô tô</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#6B7080"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#6B7080"
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#12151C" />
            : <Text style={styles.buttonText}>Đăng nhập</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12151C', justifyContent: 'center', padding: 24 },
  brand: { marginBottom: 48 },
  brandTitle: { fontSize: 40, fontWeight: '700', color: '#F5F3EE' },
  brandSub: { fontSize: 14, color: '#E8A33D', marginTop: 4 },
  form: {},
  label: { fontSize: 13, color: '#A9AEBA', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#1C212C', borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: '#F5F3EE',
    borderWidth: 1, borderColor: '#2A3142',
  },
  error: { color: '#E8776B', fontSize: 13, marginTop: 16 },
  button: {
    backgroundColor: '#E8A33D', borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#12151C', fontSize: 15, fontWeight: '700' },
});