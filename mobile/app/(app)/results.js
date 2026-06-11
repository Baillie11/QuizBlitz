import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, QUESTIONS_PER_GAME } from '../../src/config';

function getPerformanceLabel(pct) {
  if (pct === 100) return { emoji: '🏆', label: 'Perfect score!' };
  if (pct >= 80)  return { emoji: '🌟', label: 'Excellent!' };
  if (pct >= 60)  return { emoji: '👍', label: 'Good job!' };
  if (pct >= 40)  return { emoji: '🙂', label: 'Not bad!' };
  return { emoji: '💪', label: 'Keep practising!' };
}

export default function ResultsScreen() {
  const { score, total, categoryId, categoryName, difficulty } = useLocalSearchParams();
  const router = useRouter();

  const scoreNum = parseInt(score) || 0;
  const totalNum = parseInt(total) || QUESTIONS_PER_GAME;
  const pct = Math.round((scoreNum / totalNum) * 100);
  const { emoji, label } = getPerformanceLabel(pct);

  const playAgain = () => {
    router.replace({
      pathname: '/(app)/game',
      params: { categoryId, categoryName, difficulty, amount: totalNum },
    });
  };

  const changeCategory = () => {
    router.replace('/(app)/solo');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.card}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.category}>{categoryName}</Text>

          {/* Score circle */}
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{scoreNum}</Text>
            <Text style={styles.scoreTotal}>/ {totalNum}</Text>
          </View>

          <Text style={styles.pct}>{pct}% correct</Text>

          {/* Score bar */}
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={playAgain}>
          <Text style={styles.primaryBtnText}>🔄  Play Again</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={changeCategory}>
          <Text style={styles.secondaryBtnText}>📂  Change Category</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    ...Platform.select({ web: { maxWidth: 640, width: '100%', alignSelf: 'center' } }),
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  label: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  category: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, fontWeight: '600' },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    gap: 4,
  },
  scoreNumber: { fontSize: 36, fontWeight: '800', color: COLORS.primary },
  scoreTotal: { fontSize: 18, fontWeight: '600', color: COLORS.textSecondary, alignSelf: 'flex-end', paddingBottom: 6 },
  pct: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 16 },
  barBg: { width: '100%', height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 17 },
  secondaryBtn: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  secondaryBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 17 },
});
