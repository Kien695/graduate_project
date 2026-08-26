import { StyleSheet } from 'react-native';

export const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12151C' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { marginBottom: 36 },
  brandTitle: { fontSize: 40, fontWeight: '700', color: '#F5F3EE' },
  brandSub: { fontSize: 14, color: '#E8A33D', marginTop: 4 },
  screenTitle: { color: '#F5F3EE', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  screenHint: { color: '#A9AEBA', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  label: { fontSize: 13, color: '#A9AEBA', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#1C212C', borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: '#F5F3EE',
    borderWidth: 1, borderColor: '#2A3142',
  },
  inputError: { borderColor: '#E8776B' },
  fieldError: { color: '#E8776B', fontSize: 12, marginTop: 6 },
  error: { color: '#E8776B', fontSize: 13, marginTop: 16 },
  button: {
    backgroundColor: '#E8A33D', borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#12151C', fontSize: 15, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  bottomText: { color: '#A9AEBA', fontSize: 13 },
  bottomLink: { color: '#E8A33D', fontSize: 13, fontWeight: '700' },
});
