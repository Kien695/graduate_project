import { useEffect, useState } from "react";
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
import { checkLockStatus } from "../../api/auth.api";
import { useAuth } from "../../hooks/useAuth";
import AuthField from "../../components/auth/AuthField";
import { authStyles } from "../../components/auth/authStyles";
import background from "../../../assets/xe-sieu.jpg";

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!error?.lockedUntil) {
      setRemainingSeconds(0);
      return;
    }
    const target = new Date(error.lockedUntil).getTime();
    const tick = () =>
      setRemainingSeconds(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [error?.lockedUntil]);

  // Gắn thêm điều kiện error?.lockedUntil để tránh lệch pha giữa 2 state khác
  // nguồn (error đến từ Redux, remainingSeconds đến từ interval cục bộ) —
  // có thời điểm error đã về null nhưng remainingSeconds chưa kịp reset.
  const locked = remainingSeconds > 0 && Boolean(error?.lockedUntil);
  const countdownText = `${Math.floor(remainingSeconds / 60)}:${String(
    remainingSeconds % 60,
  ).padStart(2, "0")}`;
  const errorMessage = locked
    ? `Bạn đã đăng nhập sai ${error.failedAttempts} lần, hãy quay lại sau ${countdownText}.`
    : error?.lockedUntil
      ? null // đã hết thời gian khóa — ẩn thông báo cũ, cho phép thử lại
      : error?.message;

  // Trong lúc đang khóa, tự hỏi lại server mỗi vài giây — nếu admin mở khóa
  // thủ công thì tắt đồng hồ đếm ngược ngay, không cần đợi hết giờ hay bấm nút.
  useEffect(() => {
    if (!locked) return;
    const lockedEmail = email.trim();
    if (!lockedEmail) return;
    let active = true;
    const poll = async () => {
      try {
        const status = await checkLockStatus(lockedEmail);
        if (active && !status.locked) dispatch(clearError());
      } catch {
        // Lỗi mạng khi poll thì bỏ qua, chờ lần kiểm tra kế tiếp.
      }
    };
    const interval = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [locked, email, dispatch]);

  const handleLogin = () => {
    if (!email || !password || locked) return;
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

              {errorMessage ? (
                <Text style={authStyles.error}>{errorMessage}</Text>
              ) : null}
              <TouchableOpacity
                style={[
                  authStyles.button,
                  (loading || locked) && authStyles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading || locked}
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
