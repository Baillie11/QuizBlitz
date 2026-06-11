import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getMultiplayerRoom } from '../../src/services/api';
import { COLORS } from '../../src/config';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function MultiplayerResultsScreen() {
  const { roomId, playerId, roomName } = useLocalSearchParams();
  const router = useRouter();
  const [players, setPlayers] = useState([]);
  const [allDone, setAllDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  async function poll() {
    try {
      const { room } = await getMultiplayerRoom(roomId);
      const sorted = [...(room.players || [])].sort((a, b) => b.score - a.score);
      setPlayers(sorted);
      const done = sorted.every((p) => p.finished_at);
      setAllDone(done);
      if (done) clearInterval(pollRef.current);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.header}>
          <Text style={styles.title}>🏆 Results</Text>
          <Text style={styles.roomName}>{roomName}</Text>
          {!allDone && (
            <View style={styles.waitingPill}>
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.waitingText}>Waiting for others to finish…</Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          players.map((p, i) => {
            const isMe = parseInt(playerId) === p.id;
            return (
              <View key={p.id} style={[styles.row, isMe && styles.rowMe]}>
                <Text style={styles.medal}>{MEDALS[i] || `${i + 1}`}</Text>
                <View style={styles.playerAvatar}>
                  <Text style={styles.avatarText}>{p.display_name?.[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>
                    {p.display_name}{isMe ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.playerSub}>
                    {p.finished_at ? `Finished · ${p.answered_count} answered` : '⏳ Still playing…'}
                  </Text>
                </View>
                <Text style={[styles.score, i === 0 && styles.scoreFirst]}>
                  ⭐ {p.score}
                </Text>
              </View>
            );
          })
        )}

        {allDone && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(app)/multiplayer')}>
              <Text style={styles.primaryBtnText}>🎮  Back to Rooms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(app)/solo')}>
              <Text style={styles.secondaryBtnText}>👤  Play Solo</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: {
    padding: 20, paddingBottom: 40,
    ...Platform.select({ web: { maxWidth: 640, width: '100%', alignSelf: 'center' } }),
  },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  roomName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: 12 },
  waitingPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  waitingText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  rowMe: { borderWidth: 2, borderColor: COLORS.primary },
  medal: { fontSize: 24, width: 36, textAlign: 'center', marginRight: 8 },
  playerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  playerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  score: { fontSize: 18, fontWeight: '800', color: COLORS.textSecondary },
  scoreFirst: { color: COLORS.primary },
  actions: { marginTop: 24, gap: 12 },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 17 },
  secondaryBtn: {
    backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.border,
  },
  secondaryBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 17 },
});
