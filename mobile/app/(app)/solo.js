import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, SafeAreaView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCategories } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import AdBanner from '../../src/components/AdBanner';
import { COLORS, QUESTIONS_PER_GAME } from '../../src/config';

const CATEGORY_META = {
  'general-knowledge': { icon: 'book-outline',       color: '#4F46E5' },
  'movies':            { icon: 'film-outline',        color: '#DC2626' },
  'music':             { icon: 'musical-notes-outline', color: '#D97706' },
  'sports':            { icon: 'football-outline',    color: '#16A34A' },
};

const DIFFICULTIES = ['any', 'easy', 'medium', 'hard'];

export default function CategoriesScreen() {
  const { showAds, user } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Track selected difficulty per category ID
  const [difficulties, setDifficulties] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const { categories: cats } = await getCategories();
        setCategories(cats);
        // Default all to 'any'
        const defaults = {};
        cats.forEach((c) => (defaults[c.id] = 'any'));
        setDifficulties(defaults);
      } catch {
        setError('Failed to load categories. Is the backend running?');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const startGame = (category) => {
    router.push({
      pathname: '/(app)/game',
      params: {
        categoryId: category.id,
        categoryName: category.name,
        difficulty: difficulties[category.id] || 'any',
        amount: QUESTIONS_PER_GAME,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hey {user?.displayName || 'there'} 👋
          </Text>
          <Text style={styles.title}>Pick a Category</Text>
        </View>

        <AdBanner enabled={showAds} />

        {!!error && <Text style={styles.error}>{error}</Text>}

        {categories.map((cat) => {
          const meta = CATEGORY_META[cat.slug] || { icon: 'help-circle-outline', color: COLORS.primary };
          return (
            <View key={cat.id} style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: meta.color + '20' }]}>
                <Ionicons name={meta.icon} size={32} color={meta.color} />
              </View>
              <Text style={styles.catName}>{cat.name}</Text>

              {/* Difficulty selector */}
              <View style={styles.diffRow}>
                {DIFFICULTIES.map((d) => {
                  const active = (difficulties[cat.id] || 'any') === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.diffBtn, active && { backgroundColor: COLORS.primary }]}
                      onPress={() => setDifficulties((prev) => ({ ...prev, [cat.id]: d }))}
                    >
                      <Text style={[styles.diffText, active && { color: COLORS.white }]}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: meta.color }]}
                onPress={() => startGame(cat)}
              >
                <Ionicons name="play" size={16} color={COLORS.white} />
                <Text style={styles.playBtnText}>Play!</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  container: {
    padding: 20,
    paddingBottom: 40,
    ...Platform.select({ web: { maxWidth: 640, width: '100%', alignSelf: 'center' } }),
  },
  header: { marginBottom: 20 },
  greeting: { fontSize: 16, color: COLORS.textSecondary },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  error: { color: COLORS.error, marginBottom: 12, fontSize: 14 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  catName: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  diffRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  diffBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  diffText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  playBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
