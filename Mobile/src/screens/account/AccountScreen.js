import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import {
  changePassword,
  loadCurrentUser,
  logout,
  updateAvatar,
  updateProfile,
} from "../../store/slices/authSlice";
import { useAuth } from "../../hooks/useAuth";
import BottomNavigation from "../../components/common/BottomNavigation";
import { useTheme } from "../../hooks/useTheme";

const formFromUser = (user = {}) => ({
  fullName: user.full_name || "",
  email: user.email || "",
  phone: user.phone || "",
  address: user.address || "",
  avatarUrl: user.avatar_url || "",
});

export default function AccountScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [profile, setProfile] = useState(() => formFromUser(user));
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarAsset, setAvatarAsset] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    dispatch(loadCurrentUser())
      .unwrap()
      .then((freshUser) => setProfile(formFromUser(freshUser)))
      .catch((error) => Alert.alert("Không thể tải hồ sơ", String(error)))
      .finally(() => setLoadingProfile(false));
  }, [dispatch]);

  const save = async () => {
    if (!profile.fullName.trim() || !profile.email.trim())
      return Alert.alert(
        "Thiếu thông tin",
        "Họ tên và email không được để trống.",
      );
    setSaving(true);
    try {
      const updated = await dispatch(updateProfile(profile)).unwrap();
      setProfile(formFromUser(updated));
      setEditing(false);
      Alert.alert("Thành công", "Thông tin cá nhân đã được cập nhật.");
    } catch (error) {
      Alert.alert("Không thể cập nhật", String(error));
    } finally {
      setSaving(false);
    }
  };

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return Alert.alert(
        "Cần quyền truy cập",
        "Vui lòng cho phép ứng dụng truy cập thư viện ảnh.",
      );
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024)
      return Alert.alert(
        "Ảnh quá lớn",
        "Ảnh đại diện không được vượt quá 5 MB.",
      );
    if (
      asset.mimeType &&
      !["image/jpeg", "image/png", "image/webp"].includes(asset.mimeType)
    )
      return Alert.alert(
        "Định dạng không hỗ trợ",
        "Chỉ chấp nhận JPEG, PNG hoặc WEBP.",
      );
    setAvatarAsset(asset);
  };

  const uploadAvatar = async () => {
    if (!avatarAsset) return;
    setUploadingAvatar(true);
    try {
      const updated = await dispatch(updateAvatar(avatarAsset)).unwrap();
      setProfile(formFromUser(updated));
      setAvatarAsset(null);
      await dispatch(loadCurrentUser()).unwrap();
      Alert.alert("Thành công", "Ảnh đại diện đã được cập nhật.");
    } catch (error) {
      Alert.alert("Không thể cập nhật avatar", String(error));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const submitPassword = async () => {
    if (
      !password.currentPassword ||
      !password.newPassword ||
      !password.confirmPassword
    )
      return Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập đầy đủ ba trường mật khẩu.",
      );
    if (password.newPassword.length < 8)
      return Alert.alert(
        "Mật khẩu chưa hợp lệ",
        "Mật khẩu mới phải có ít nhất 8 ký tự.",
      );
    if (password.newPassword === password.currentPassword)
      return Alert.alert(
        "Mật khẩu chưa hợp lệ",
        "Mật khẩu mới phải khác mật khẩu hiện tại.",
      );
    if (password.newPassword !== password.confirmPassword)
      return Alert.alert(
        "Mật khẩu chưa hợp lệ",
        "Mật khẩu xác nhận không khớp.",
      );
    setChangingPassword(true);
    try {
      await dispatch(
        changePassword({
          currentPassword: password.currentPassword,
          newPassword: password.newPassword,
        }),
      ).unwrap();
      Alert.alert("Đổi mật khẩu thành công", "Vui lòng đăng nhập lại.");
      await dispatch(logout()).unwrap();
    } catch (error) {
      Alert.alert("Không thể đổi mật khẩu", String(error));
    } finally {
      setChangingPassword(false);
    }
  };

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      await dispatch(logout()).unwrap();
    } finally {
      setLoggingOut(false);
    }
  };
  const confirmLogout = () => {
    const message = "Bạn có chắc muốn đăng xuất khỏi thiết bị này?";
    if (Platform.OS === "web") {
      if (globalThis.confirm(message)) void performLogout();
      return;
    }
    Alert.alert("Đăng xuất", message, [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: performLogout },
    ]);
  };

  const initial = (user?.full_name || user?.email || "K")
    .trim()
    .charAt(0)
    .toUpperCase();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Tài khoản</Text>
              <Text style={styles.subtitle}>
                Thông tin tài khoản khách hàng
              </Text>
            </View>
            <TouchableOpacity onPress={() => setEditing((value) => !value)}>
              <Text style={styles.edit}>{editing ? "Hủy" : "Chỉnh sửa"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileCard}>
            {avatarAsset?.uri || user?.avatar_url ? (
              <Image
                source={{ uri: avatarAsset?.uri || user.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
            <View style={styles.profileText}>
              <Text style={styles.name}>{user?.full_name || "Khách hàng"}</Text>
              <Text style={styles.email}>
                {user?.email || "Chưa cập nhật email"}
              </Text>
              <Text style={styles.role}>
                {String(user?.role || "customer").toUpperCase()}
              </Text>
              <TouchableOpacity
                disabled={uploadingAvatar}
                onPress={chooseAvatar}
              >
                <Text style={styles.changeAvatar}>Đổi ảnh đại diện</Text>
              </TouchableOpacity>
            </View>
          </View>
          {avatarAsset && (
            <View style={styles.avatarActions}>
              <Text style={styles.previewHint}>
                Ảnh xem trước — xác nhận để tải lên
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  disabled={uploadingAvatar}
                  style={styles.cancelAvatar}
                  onPress={() => setAvatarAsset(null)}
                >
                  <Text style={styles.cancelAvatarText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={uploadingAvatar}
                  style={[
                    styles.uploadAvatar,
                    uploadingAvatar && styles.disabled,
                  ]}
                  onPress={uploadAvatar}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.uploadAvatarText}>Tải ảnh lên</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loadingProfile ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
              <ProfileField
                colors={colors}
                label="Họ và tên"
                value={profile.fullName}
                editable={editing}
                onChangeText={(value) =>
                  setProfile({ ...profile, fullName: value })
                }
              />
              <ProfileField
                colors={colors}
                label="Email"
                value={profile.email}
                editable={editing}
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={(value) =>
                  setProfile({ ...profile, email: value })
                }
              />
              <ProfileField
                colors={colors}
                label="Số điện thoại"
                value={profile.phone}
                editable={editing}
                keyboardType="phone-pad"
                onChangeText={(value) =>
                  setProfile({ ...profile, phone: value })
                }
              />
              <ProfileField
                colors={colors}
                label="Địa chỉ"
                value={profile.address}
                editable={editing}
                onChangeText={(value) =>
                  setProfile({ ...profile, address: value })
                }
              />
              <ProfileField
                colors={colors}
                label="Vai trò"
                value={String(user?.role || "customer").toUpperCase()}
                editable={false}
              />
              <ProfileField
                colors={colors}
                label="Ngày tạo tài khoản"
                value={
                  user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("vi-VN")
                    : "Chưa có dữ liệu"
                }
                editable={false}
              />
              {editing && (
                <TouchableOpacity
                  disabled={saving}
                  style={[styles.primaryButton, saving && styles.disabled]}
                  onPress={save}
                >
                  <Text style={styles.primaryText}>
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>
            <ProfileField
              colors={colors}
              label="Mật khẩu hiện tại"
              value={password.currentPassword}
              secureTextEntry
              onChangeText={(value) =>
                setPassword({ ...password, currentPassword: value })
              }
            />
            <ProfileField
              colors={colors}
              label="Mật khẩu mới"
              value={password.newPassword}
              secureTextEntry
              onChangeText={(value) =>
                setPassword({ ...password, newPassword: value })
              }
            />
            <ProfileField
              colors={colors}
              label="Xác nhận mật khẩu mới"
              value={password.confirmPassword}
              secureTextEntry
              onChangeText={(value) =>
                setPassword({ ...password, confirmPassword: value })
              }
            />
            <TouchableOpacity
              disabled={changingPassword}
              style={[
                styles.secondaryButton,
                changingPassword && styles.disabled,
              ]}
              onPress={submitPassword}
            >
              <Text style={styles.secondaryText}>
                {changingPassword ? "Đang xử lý..." : "Đổi mật khẩu"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.logoutButton, loggingOut && styles.disabled]}
            disabled={loggingOut}
            onPress={confirmLogout}
          >
            <Ionicons name="log-out-outline" size={21} color="#C53030" />
            <Text style={styles.logoutText}>
              {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        <BottomNavigation navigation={navigation} active="account" />
      </View>
    </SafeAreaView>
  );
}

function ProfileField({ label, editable = true, colors, ...props }) {
  const styles = getStyles(colors);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        editable={editable}
        placeholder="Chưa cập nhật"
        placeholderTextColor={colors.muted}
        style={[styles.input, !editable && styles.readonly]}
      />
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 18, paddingBottom: 28 },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "900",
      marginTop: 8,
    },
    subtitle: { color: colors.muted, fontSize: 13, marginTop: 5 },
    edit: { color: colors.primary, fontSize: 14, fontWeight: "800" },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 24,
      padding: 18,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    avatarText: { color: colors.white, fontSize: 25, fontWeight: "900" },
    profileText: { flex: 1, marginLeft: 14 },
    name: { color: colors.text, fontSize: 17, fontWeight: "800" },
    email: { color: colors.muted, fontSize: 13, marginTop: 5 },
    role: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "900",
      marginTop: 7,
    },
    changeAvatar: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 9,
    },
    avatarActions: {
      marginTop: 10,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewHint: { color: colors.muted, fontSize: 12, marginBottom: 11 },
    actionRow: { flexDirection: "row", gap: 10 },
    cancelAvatar: {
      flex: 1,
      minHeight: 43,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelAvatarText: { color: colors.text, fontSize: 12, fontWeight: "700" },
    uploadAvatar: {
      flex: 1,
      minHeight: 43,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: colors.primary,
    },
    uploadAvatarText: { color: colors.white, fontSize: 12, fontWeight: "900" },
    loader: { marginVertical: 35 },
    section: {
      marginTop: 20,
      padding: 17,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 7,
    },
    field: { marginTop: 13 },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 6,
    },
    input: {
      minHeight: 46,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    readonly: { color: colors.muted, opacity: 0.8 },
    primaryButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 18,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    primaryText: { color: colors.white, fontWeight: "900" },
    secondaryButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 18,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    secondaryText: { color: colors.primary, fontWeight: "900" },
    logoutButton: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 22,
      borderRadius: 15,
      backgroundColor: "#FFF0F0",
      borderWidth: 1,
      borderColor: "#F3B8B8",
    },
    logoutText: {
      color: "#C53030",
      fontSize: 15,
      fontWeight: "800",
      marginLeft: 9,
    },
    disabled: { opacity: 0.6 },
  });
