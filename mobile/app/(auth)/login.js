import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/config';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) return setError('Please enter your email and password.');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(app)/solo');
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={styles.title}>TriviaApp</Text>
          <Text style={styles.subtitle}>Test your knowledge</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.btnText}>Log In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  emoji: { fontSize: 56 },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.primary, marginTop: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    // Use boxShadow on web (shadow* props are deprecated there); keep native shadows elsewhere.
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      },
    }),
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  error: {
    color: COLORS.error,
    backgroundColor: COLORS.errorLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 14,
  },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    color: COLORS.text,
  },
  passwordRow: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 44 },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 16, // offsets the TextInput's marginBottom so the button centers vertically
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  eyeIcon: { fontSize: 18 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontWeight: '700' },
});
