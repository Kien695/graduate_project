import { useState } from "react";
import {
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import { login, clearError } from "../../store/slices/authSlice";
import { useAuth } from "../../hooks/useAuth";
import AuthField from "../../components/auth/AuthField";
import { authStyles } from "../../components/auth/authStyles";
import background from "../../../assets/xe-dep.webp";

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!email || !password) return;
    dispatch(clearError());
    dispatch(login({ email: email.trim(), password }));
  };

  return (
    <ImageBackground
      source={background}
      style={authStyles.background}
      resizeMode="cover"
    >
      <View style={authStyles.overlay}>
        <KeyboardAvoidingView
          style={authStyles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={authStyles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={authStyles.card}>
              <Text style={authStyles.screenTitle}>Đăng nhập</Text>

              <AuthField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <AuthField
                label="Mật khẩu"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
              />

              {error ? <Text style={authStyles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[
                  authStyles.button,
                  loading && authStyles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={authStyles.buttonText}>Đăng nhập</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={authStyles.bottomRow}
                onPress={() => navigation.navigate("RegisterCustomer")}
              >
                <Text style={authStyles.bottomText}>Chưa có tài khoản? </Text>
                <Text style={authStyles.bottomLink}>Đăng ký tài khoản</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}
