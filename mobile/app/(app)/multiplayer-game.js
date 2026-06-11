import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, ScrollView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getMultiplayerRoom, submitMultiplayerAnswer, finishMultiplayerGame } from '../../src/services/api';
import { COLORS, ANSWER_REVEAL_DELAY_MS } from '../../src/config';

export default function MultiplayerGameScreen() {
  const { roomId, playerId, roomName } = useLocalSearchParams();
  const router = useRouter();

  const [questions, setQuestions]       = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected]         = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const timerRef    = useRef(null);
  const tickRef     = useRef(null);
  const startTimeRef = useRef(null);
  const [elapsed, setElapsed]     = useState(0);
  const [answerTime, setAnswerTime] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { room } = await getMultiplayerRoom(roomId);
        const qs = Array.isArray(room.questions_json)
          ? room.questions_json
          : (typeof room.questions_json === 'string' ? JSON.parse(room.questions_json) : []);
        setQuestions(qs);
      } catch {
        setError('Failed to load questions.');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { clearTimeout(timerRef.current); clearInterval(tickRef.current); };
  }, []);

  useEffect(() => {
    if (loading || !questions.length) return;
    setElapsed(0);
    setAnswerTime(null);
    startTimeRef.current = Date.now();
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 100);
    return () => clearInterval(tickRef.current);
  }, [currentIndex, loading, questions.length]);

  const handleAnswer = async (answer) => {
    if (showFeedback) return;
    const taken = Date.now() - startTimeRef.current;
    setAnswerTime(taken);
    clearInterval(tickRef.current);

    const isCorrect = answer === questions[currentIndex].correct_answer;
    const pts = questions[currentIndex].points || 2;
    const newScore = isCorrect ? score + pts : score;
    if (isCorrect) setScore(newScore);
    setSelected(answer);
    setShowFeedback(true);

    // Submit running score to server
    try { await submitMultiplayerAnswer(roomId, parseInt(playerId), newScore); } catch { /* non-fatal */ }

    timerRef.current = setTimeout(async () => {
      setShowFeedback(false);
      setSelected(null);
      const isLast = currentIndex === questions.length - 1;
      if (isLast) {
        try { await finishMultiplayerGame(roomId, parseInt(playerId), newScore); } catch { /* non-fatal */ }
        router.replace({
          pathname: '/(app)/multiplayer-results',
          params: { roomId, playerId, roomName },
        });
      } else {
        setCurrentIndex((i) => i + 1);
      }
    }, ANSWER_REVEAL_DELAY_MS);
  };

  if (loading) return (
    <SafeAreaView style={styles.centered}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Loading game…</Text>
    </SafeAreaView>
  );

  if (error || !questions.length) return (
    <SafeAreaView style={styles.centered}>
      <Text style={styles.errorText}>{error || 'No questions found.'}</Text>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(app)/multiplayer')}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const q = questions[currentIndex];
  const progress = (currentIndex + 1) / questions.length;

  const getOptionStyle = (opt) => {
    if (!showFeedback) return styles.option;
    if (opt === q.correct_answer) return [styles.option, styles.optionCorrect];
    if (opt === selected) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDimmed];
  };
  const getOptionTextStyle = (opt) => {
    if (!showFeedback) return styles.optionText;
    if (opt === q.correct_answer || opt === selected) return [styles.optionText, styles.optionTextActive];
    return [styles.optionText, styles.optionTextDimmed];
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.topRow}>
          <Text style={styles.roomLabel}>🎮 {roomName}</Text>
          <Text style={styles.progress}>{currentIndex + 1} / {questions.length}</Text>
          <View style={styles.scorePill}><Text style={styles.scoreText}>⭐ {score}</Text></View>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.meta}>
          {q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : 'Mixed'} · ⭐ {q.points || 2} pts
        </Text>

        <View style={styles.timerRow}>
          <Text style={[styles.timerText, answerTime !== null && styles.timerDone]}>
            {answerTime !== null ? `⏱ Answered in ${(answerTime / 1000).toFixed(1)}s` : `⏱ ${(elapsed / 1000).toFixed(1)}s`}
          </Text>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{q.question}</Text>
        </View>

        <View style={styles.options}>
          {q.options.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={getOptionStyle(opt)}
              onPress={() => handleAnswer(opt)}
              activeOpacity={0.85}
              disabled={showFeedback}
            >
              <Text style={getOptionTextStyle(opt)}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: COLORS.background },
  container: {
    padding: 20, paddingBottom: 40,
    ...Platform.select({ web: { maxWidth: 640, width: '100%', alignSelf: 'center' } }),
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  roomLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', flex: 1 },
  progress: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  scorePill: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  scoreText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  progressBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '600' },
  timerRow: { marginBottom: 14 },
  timerText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  timerDone: { color: COLORS.primary, fontWeight: '700' },
  questionCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  questionText: { fontSize: 18, fontWeight: '600', color: COLORS.text, lineHeight: 26 },
  options: { gap: 10 },
  option: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderWidth: 2, borderColor: COLORS.border },
  optionCorrect: { backgroundColor: COLORS.successLight, borderColor: COLORS.success },
  optionWrong:   { backgroundColor: COLORS.errorLight,   borderColor: COLORS.error },
  optionDimmed:  { opacity: 0.5 },
  optionText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  optionTextActive: { fontWeight: '700' },
  optionTextDimmed: { color: COLORS.textSecondary },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 15 },
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', marginBottom: 16 },
  backBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: COLORS.white, fontWeight: '700' },
});
