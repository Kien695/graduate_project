import { Text, TextInput } from 'react-native';
import { authStyles } from './authStyles';

export default function AuthField({ label, error, ...inputProps }) {
  return <>
    <Text style={authStyles.label}>{label}</Text>
    <TextInput
      style={[authStyles.input, error && authStyles.inputError]}
      placeholderTextColor="#6B7080"
      {...inputProps}
    />
    {error ? <Text style={authStyles.fieldError}>{error}</Text> : null}
  </>;
}
