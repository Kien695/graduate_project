import { Text, TextInput } from 'react-native';
import { authStyles } from './authStyles';

export default function AuthField({ label, error, ...inputProps }) {
  return <>
    <Text style={authStyles.label}>{label}</Text>
    <TextInput
      style={[authStyles.input, error && authStyles.inputError]}
      placeholderTextColor="rgba(226,232,240,0.55)"
      {...inputProps}
    />
    {error ? <Text style={authStyles.fieldError}>{error}</Text> : null}
  </>;
}
