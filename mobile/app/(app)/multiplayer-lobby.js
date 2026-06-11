import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ActivityIndicator, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMultiplayerRoom } from '../../src/services/api';
import { COLORS } from '../../src/config';

export default function MultiplayerLobbyScreen() {
  const { roomId, playerId, roomName } = useLocalSearchParams();
  const router = useRouter();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  async function poll() {
    try {
      const { room: r } = await getMultiplayerRoom(roomId);
      setRoom(r);
      if (r.status === 'in_progress') {
        clearInterval(pollRef.current);
        router.replace({
          pathname: '/(app)/multiplayer-game',
          params: { roomId, playerId, roomName: r.name },
        });
      } else if (r.status === 'cancelled') {
        clearInterval(pollRef.current);
        setError('This room was cancelled by the admin.');
      }
    } catch {
      setError('Lost connection to server.');
    }
  }

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  if (!room) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.waitText}>Joining lobby…</Text>
      </SafeAreaView>
    );
  }

  const threshold = room.threshold || Math.ceil(room.max_players * room.start_threshold_percent / 100);
  const needed = room.needed_to_start || 0;
  const pct = Math.min(100, Math.round((room.player_count / room.max_players) * 100));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.header}>
          <Text style={styles.roomName}>{room.name}</Text>
          <View style={styles.statusPill}>
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.statusText}>Waiting for players…</Text>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(app)/multiplayer')}>
              <Text style={styles.backBtnText}>← Back to Rooms</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress towards start */}
        <View style={styles.card}>
          <View style={styles.countRow}>
            <Text style={styles.countNum}>{room.player_count}</Text>
            <Text style={styles.countSep}> / </Text>
            <Text style={styles.countMax}>{room.max_players}</Text>
            <Text style={styles.countLabel}> players joined</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.thresholdText}>
            {needed > 0
              ? `${needed} more player${needed !== 1 ? 's' : ''} needed to auto-start`
              : '🚀 Starting soon…'
            }
          </Text>
          <Text style={styles.thresholdSub}>
            Auto-starts at {threshold} players ({room.start_threshold_percent}% of {room.max_players})
          </Text>
        </View>

        {/* Player list */}
        <Text style={styles.sectionTitle}>In this room</Text>
        {(room.players || []).map((p, i) => (
          <View key={p.id} style={[styles.playerRow, parseInt(playerId) === p.id && styles.playerRowMe]}>
            <View style={styles.playerAvatar}>
              <Text style={styles.playerAvatarText}>{p.display_name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <Text style={styles.playerName}>
              {p.display_name}{parseInt(playerId) === p.id ? ' (you)' : ''}
            </Text>
            {i === 0 && <Text style={styles.firstTag}>first</Text>}
          </View>
        ))}

        <Text style={styles.hint}>This page updates automatically every 2 seconds.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  container: {
    padding: 20, paddingBottom: 40,
    ...Platform.select({ web: { maxWidth: 640, width: '100%', alignSelf: 'center' } }),
  },
  header: { marginBottom: 20 },
  roomName: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  statusText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  waitText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 15 },
  errorCard: {
    backgroundColor: COLORS.errorLight, borderRadius: 12, padding: 16, marginBottom: 16,
  },
  errorText: { color: COLORS.error, fontSize: 14, marginBottom: 12 },
  backBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 10, alignItems: 'center' },
  backBtnText: { color: COLORS.white, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  countRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  countNum: { fontSize: 40, fontWeight: '800', color: COLORS.primary },
  countSep: { fontSize: 24, color: COLORS.textSecondary },
  countMax: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  countLabel: { fontSize: 14, color: COLORS.textSecondary, marginLeft: 4 },
  progressBar: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  thresholdText: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  thresholdSub: { fontSize: 12, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 10 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  playerRowMe: { borderWidth: 2, borderColor: COLORS.primary },
  playerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  playerAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  playerName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  firstTag: {
    fontSize: 11, fontWeight: '700', color: COLORS.primary,
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  hint: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 16 },
});
