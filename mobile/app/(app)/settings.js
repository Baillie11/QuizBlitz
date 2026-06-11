import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { resetMyPassword } from '../../src/services/api';
import { COLORS } from '../../src/config';

export default function SettingsScreen() {
  const { user, showAds, logout } = useAuth();
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const doReset = async () => {
    setResetting(true);
    try {
      await resetMyPassword();
      const msg = 'Password has been reset. Use "J@yden11" on your next login.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Password reset', msg);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to reset password.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setResetting(false);
    }
  };

  const handlePasswordReset = () => {
    const title = 'Password reset, please';
    const message =
      'Reset your password to the local-dev default ("J@yden11")?\n\n' +
      'Once we go live, this will send a reset link to your email instead.';

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) doReset();
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset password', style: 'destructive', onPress: doReset },
    ]);
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile card */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{user?.displayName || 'Anonymous'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          {/* Premium badge */}
          <View style={[styles.badge, user?.isPremium ? styles.badgePremium : styles.badgeFree]}>
            <Text style={[styles.badgeText, user?.isPremium ? styles.badgePremiumText : styles.badgeFreeText]}>
              {user?.isPremium ? '⭐ Premium' : 'Free'}
            </Text>
          </View>
        </View>

        {/* Ads section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advertising</Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Ads currently</Text>
              <Text style={[styles.rowValue, showAds ? styles.valueOn : styles.valueOff]}>
                {showAds ? 'Showing' : 'Hidden'}
              </Text>
            </View>
          </View>

        </View>

        {/* Premium section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium</Text>
          {user?.isPremium ? (
            <View style={styles.premiumActive}>
              <Text style={styles.premiumActiveText}>✅ You're on Premium — no ads, ever.</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.premiumBtn} disabled>
              <Text style={styles.premiumBtnText}>⭐  Go Premium (coming soon)</Text>
              <Text style={styles.premiumBtnSub}>Remove ads · Support development</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={[styles.resetBtn, resetting && styles.btnDisabled]}
            onPress={handlePasswordReset}
            disabled={resetting}
          >
            <Text style={styles.resetText}>
              {resetting ? 'Resetting…' : '🔑 Password reset, please'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 20 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  profileInfo: { flex: 1 },
  displayName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  email: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeFree: { backgroundColor: COLORS.border },
  badgePremium: { backgroundColor: '#FFF3CD' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeFreeText: { color: COLORS.textSecondary },
  badgePremiumText: { color: '#856404' },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, gap: 8 },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rowValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  valueOn: { color: COLORS.primary },
  valueOff: { color: COLORS.success },

  premiumBtn: {
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F9A825',
    opacity: 0.85,
  },
  premiumBtnText: { fontSize: 16, fontWeight: '700', color: '#795500', marginBottom: 4 },
  premiumBtnSub: { fontSize: 12, color: '#795500' },
  premiumActive: {
    backgroundColor: COLORS.successLight,
    borderRadius: 12,
    padding: 16,
  },
  premiumActiveText: { fontSize: 15, fontWeight: '600', color: '#166534' },

  logoutBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  logoutText: { color: COLORS.error, fontWeight: '700', fontSize: 16 },
  resetBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  resetText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
});
