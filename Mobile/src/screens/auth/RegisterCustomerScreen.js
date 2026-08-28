import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity,
} from 'react-native';
import { registerCustomer } from '../../api/auth.api';
import AuthField from '../../components/auth/AuthField';
import { authStyles } from '../../components/auth/authStyles';

const initialForm = { name: '', email: '', phone: '', password: '', confirmPassword: '' };

const validate = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Vui lòng nhập họ và tên';
  if (!form.email.trim()) errors.email = 'Vui lòng nhập email';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Email không đúng định dạng';
  if (!form.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại';
  else if (!/^(0\d{9}|\+84\d{9})$/.test(form.phone.trim())) errors.phone = 'Số điện thoại không hợp lệ';
  if (!form.password) errors.password = 'Vui lòng nhập mật khẩu';
  else if (form.password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
  if (!form.confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu';
  else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Mật khẩu nhập lại không khớp';
  return errors;
};

export default function RegisterCustomerScreen({ navigation }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError('');
  };
  const handleRegister = async () => {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      await registerCustomer({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      Alert.alert('Đăng ký thành công', 'Tài khoản của bạn đã được tạo.', [
        { text: 'Đăng nhập', onPress: () => navigation.replace('Login') },
      ]);
    } catch (error) {
      const response = error.response?.data;
      const fieldErrors = {};
      (response?.errors || []).forEach((item) => { if (item.field) fieldErrors[item.field] = item.message; });
      setErrors(fieldErrors);
      setServerError(Object.keys(fieldErrors).length ? '' : response?.message || 'Không thể kết nối tới hệ thống. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={authStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={authStyles.content} keyboardShouldPersistTaps="handled">
        <Text style={authStyles.brandTitle}>Vào gara.</Text>
        <Text style={authStyles.brandSub}>AUTO DEALER</Text>
        <Text style={[authStyles.screenTitle, { marginTop: 36 }]}>Đăng ký tài khoản</Text>
        <Text style={authStyles.screenHint}>Tạo tài khoản khách hàng để đặt xe và theo dõi đơn hàng.</Text>

        <AuthField label="Họ và tên" value={form.name} onChangeText={(value) => updateField('name', value)} placeholder="Nguyễn Văn A" autoCapitalize="words" error={errors.name} />
        <AuthField label="Email" value={form.email} onChangeText={(value) => updateField('email', value)} placeholder="customer@gmail.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={errors.email} />
        <AuthField label="Số điện thoại" value={form.phone} onChangeText={(value) => updateField('phone', value)} placeholder="0123456789" keyboardType="phone-pad" error={errors.phone} />
        <AuthField label="Mật khẩu" value={form.password} onChangeText={(value) => updateField('password', value)} placeholder="Tối thiểu 6 ký tự" secureTextEntry error={errors.password} />
        <AuthField label="Nhập lại mật khẩu" value={form.confirmPassword} onChangeText={(value) => updateField('confirmPassword', value)} placeholder="Nhập lại mật khẩu" secureTextEntry error={errors.confirmPassword} />

        {serverError ? <Text style={authStyles.error}>{serverError}</Text> : null}
        <TouchableOpacity style={[authStyles.button, loading && authStyles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={authStyles.buttonText}>Đăng ký</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={authStyles.bottomRow} onPress={() => navigation.goBack()}>
          <Text style={authStyles.bottomText}>Đã có tài khoản? </Text>
          <Text style={authStyles.bottomLink}>Đăng nhập</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
