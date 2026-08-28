import { StyleSheet } from 'react-native';
import { COLORS } from '../../utils/theme';

export const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { marginBottom: 36 },
  brandTitle: { fontSize: 40, fontWeight: '700', color: COLORS.text },
  brandSub: { fontSize: 14, color: COLORS.primary, marginTop: 4 },
  screenTitle: { color: COLORS.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  screenHint: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  label: { fontSize: 13, color: COLORS.muted, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border,
  },
  inputError: { borderColor: '#E8776B' },
  fieldError: { color: '#E8776B', fontSize: 12, marginTop: 6 },
  error: { color: '#E8776B', fontSize: 13, marginTop: 16 },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  bottomText: { color: COLORS.muted, fontSize: 13 },
  bottomLink: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});
