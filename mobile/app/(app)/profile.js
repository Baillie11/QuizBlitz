import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { getProfile } from '../../src/services/api';
import { COLORS } from '../../src/config';

const formatDuration = (milliseconds) => {
  if (!milliseconds) return '—';
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
};

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  : 'Unknown date';

export default function ProfileScreen() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadProfile = useCallback(async () => {
    setError('');
    try {
      const data = await getProfile();
      setProfile(data);
      setName(data.user.displayName || '');
      setEmail(data.user.email || '');
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const saveDetails = async () => {
    setError('');
    setMessage('');
    if (!email.trim()) return setError('Email is required.');
    setSaving(true);
    try {
      await updateUser({ displayName: name.trim(), email: email.trim() });
      setMessage('Profile updated.');
      setEditing(false);
      await loadProfile();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not update your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></SafeAreaView>;
  }

  const stats = profile?.stats || {};
  const history = profile?.history || [];
  const initials = (name || email || '?').split(/\s+/).map((part) => part[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>Player Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={styles.identity}>
            {editing ? <>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" />
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </> : <>
              <Text style={styles.name}>{name || 'Player'}</Text>
              <Text style={styles.email}>{email}</Text>
              <Text style={styles.memberSince}>Member since {formatDate(profile?.user?.createdAt)}</Text>
            </>}
          </View>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} accessibilityLabel="Edit profile">
              <Ionicons name="pencil-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!message && <Text style={styles.success}>{message}</Text>}

        {editing && <View style={styles.editActions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); loadProfile(); }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={saveDetails} disabled={saving}>
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save details'}</Text>
          </TouchableOpacity>
        </View>}

        <Text style={styles.sectionTitle}>Lifetime stats</Text>
        <View style={styles.statsGrid}>
          <Stat label="Games played" value={stats.gamesPlayed || 0} icon="game-controller-outline" />
          <Stat label="Total score" value={stats.totalScore || 0} icon="checkmark-circle-outline" />
          <Stat label="Accuracy" value={`${stats.accuracy || 0}%`} icon="analytics-outline" />
          <Stat label="Avg. answer" value={formatDuration(stats.averageAnswerTimeMs)} icon="timer-outline" />
        </View>

        <Text style={styles.sectionTitle}>Game history</Text>
        {!history.length ? (
          <View style={styles.empty}><Text style={styles.emptyText}>Play a game to begin your history.</Text></View>
        ) : history.map((game) => (
          <View key={game.id} style={styles.historyCard}>
            <View style={styles.historyTop}>
              <View style={styles.historyInfo}>
                <Text style={styles.category}>{game.category}</Text>
                <Text style={styles.historyMeta}>{game.difficulty} · {formatDate(game.playedAt)}</Text>
              </View>
              <View style={styles.resultBadge}>
                <Text style={styles.result}>{game.score}/{game.totalQuestions}</Text>
                <Text style={styles.percentage}>{game.percentage}%</Text>
              </View>
            </View>
            <View style={styles.timingRow}>
              <Ionicons name="time-outline" size={15} color={COLORS.textSecondary} />
              <Text style={styles.timingText}>Total answer time: {formatDuration(game.totalAnswerTimeMs)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Stat({ label, value, icon }) {
  return <View style={styles.statCard}>
    <Ionicons name={icon} size={22} color={COLORS.primary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  container: { padding: 20, paddingBottom: 48, ...Platform.select({ web: { maxWidth: 720, width: '100%', alignSelf: 'center' } }) },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  profileCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14, elevation: 3 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontSize: 20, fontWeight: '800' },
  identity: { flex: 1 },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  email: { color: COLORS.textSecondary, fontSize: 14, marginTop: 3 },
  memberSince: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, padding: 10, color: COLORS.text, backgroundColor: '#FAFAFA', marginBottom: 10 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 16 },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 18 },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 18 },
  saveText: { color: COLORS.white, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: COLORS.error, backgroundColor: COLORS.errorLight, padding: 10, borderRadius: 8, marginBottom: 12 },
  success: { color: '#166534', backgroundColor: COLORS.successLight, padding: 10, borderRadius: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginTop: 12, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard: { width: '48%', flexGrow: 1, minWidth: 140, backgroundColor: COLORS.card, borderRadius: 14, padding: 15 },
  statValue: { fontSize: 23, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  historyCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 10 },
  historyTop: { flexDirection: 'row', alignItems: 'center' },
  historyInfo: { flex: 1 },
  category: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  historyMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, textTransform: 'capitalize' },
  resultBadge: { alignItems: 'flex-end' },
  result: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  percentage: { fontSize: 12, color: COLORS.textSecondary },
  timingRow: { flexDirection: 'row', gap: 5, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 12, paddingTop: 10 },
  timingText: { fontSize: 12, color: COLORS.textSecondary },
  empty: { backgroundColor: COLORS.card, borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary },
});
