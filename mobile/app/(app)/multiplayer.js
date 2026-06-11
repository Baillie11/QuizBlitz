import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, SafeAreaView, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { getMultiplayerRooms, joinMultiplayerRoom } from '../../src/services/api';
import { COLORS } from '../../src/config';

const DIFF_COLORS = { easy: '#16A34A', medium: '#D97706', hard: '#DC2626' };

export default function MultiplayerScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { rooms: r } = await getMultiplayerRooms();
      setRooms(r);
      setError('');
    } catch {
      setError('Could not load rooms. Is the server running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleJoin(room) {
    setJoiningId(room.id);
    try {
      const displayName = user?.displayName || user?.email?.split('@')[0] || 'Guest';
      const { playerId, room: roomState } = await joinMultiplayerRoom(room.id, displayName);
      router.push({
        pathname: '/(app)/multiplayer-lobby',
        params: { roomId: room.id, playerId, roomName: room.name },
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to join room.');
    } finally {
      setJoiningId(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Multiplayer</Text>
          <Text style={styles.subtitle}>Join an open game room</Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {rooms.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎮</Text>
            <Text style={styles.emptyTitle}>No open rooms</Text>
            <Text style={styles.emptyText}>Check back soon — an admin will create a room for you to join.</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={load}>
              <Text style={styles.refreshBtnText}>↻  Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          rooms.map((room) => {
            const pct = Math.round((room.player_count / room.max_players) * 100);
            const needed = Math.max(0, Math.max(room.min_players, room.threshold) - room.player_count);
            return (
              <View key={room.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <View style={styles.badges}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{room.category_name}</Text>
                      </View>
                      {room.difficulty ? (
                        <View style={[styles.badge, { backgroundColor: DIFF_COLORS[room.difficulty] + '20' }]}>
                          <Text style={[styles.badgeText, { color: DIFF_COLORS[room.difficulty] }]}>
                            {room.difficulty}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.badge}><Text style={styles.badgeText}>Mixed</Text></View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.joinBtn, joiningId === room.id && styles.joinBtnDisabled]}
                    onPress={() => handleJoin(room)}
                    disabled={joiningId === room.id}
                  >
                    {joiningId === room.id
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={styles.joinBtnText}>Join</Text>
                    }
                  </TouchableOpacity>
                </View>

                {/* Player count + progress bar */}
                <View style={styles.playerRow}>
                  <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.playerCount}>
                    {room.player_count} / {room.max_players} players
                  </Text>
                  {needed > 0 && (
                    <Text style={styles.neededText}> · {needed} more to auto-start</Text>
                  )}
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
                </View>
              </View>
            );
          })
        )}
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
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  errorText: { color: COLORS.error, marginBottom: 12, fontSize: 14 },
  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 32,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  refreshBtn: {
    marginTop: 16, backgroundColor: COLORS.primary,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  refreshBtnText: { color: COLORS.white, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardInfo: { flex: 1, marginRight: 12 },
  roomName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  joinBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 10, minWidth: 60, alignItems: 'center',
  },
  joinBtnDisabled: { opacity: 0.6 },
  joinBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  playerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  playerCount: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 4 },
  neededText: { fontSize: 13, color: COLORS.warning },
  progressBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
});
