import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, ScrollView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { startGame, submitGame } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import AdBanner from '../../src/components/AdBanner';
import AdInterstitial from '../../src/components/AdInterstitial';
import { COLORS, ANSWER_REVEAL_DELAY_MS } from '../../src/config';

export default function GameScreen() {
  const { categoryId, categoryName, difficulty, amount, gameId } = useLocalSearchParams();
  const { showAds, showQuestionTimer } = useAuth();
  const router = useRouter();

  const [questions, setQuestions]       = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected]         = useState(null);   // chosen answer string
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore]               = useState(0); // points earned
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const timerRef    = useRef(null);
  const tickRef     = useRef(null);       // interval for live timer
  const startTimeRef = useRef(null);     // Date.now() when question shown
  const answerTimesRef = useRef([]);     // elapsed milliseconds for each question
  const [elapsed, setElapsed]   = useState(0);    // ms since question shown
  const [answerTime, setAnswerTime] = useState(null); // ms taken to answer

  useEffect(() => {
    async function load() {
      clearTimeout(timerRef.current);
      clearInterval(tickRef.current);
      setQuestions([]);
      setCurrentIndex(0);
      setSelected(null);
      setShowFeedback(false);
      setScore(0);
      setCorrectCount(0);
      setElapsed(0);
      setAnswerTime(null);
      setError('');
      setLoading(true);
      startTimeRef.current = null;
      answerTimesRef.current = [];
      try {
        const diff = difficulty === 'any' ? undefined : difficulty;
        const { questions: qs } = await startGame(
          parseInt(categoryId), diff, parseInt(amount) || 10
        );
        setQuestions(qs);
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load questions. Try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { clearTimeout(timerRef.current); clearInterval(tickRef.current); };
  }, [categoryId, difficulty, amount, gameId]);

  // Start/reset the live timer whenever the question index changes
  useEffect(() => {
    if (loading || !questions.length) return;
    setElapsed(0);
    setAnswerTime(null);
    startTimeRef.current = Date.now();
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 100);
    return () => clearInterval(tickRef.current);
  }, [currentIndex, loading, questions.length]);

  const handleAnswer = (answer) => {
    if (showFeedback) return; // prevent double-tap during feedback window

    // Record answer time and stop the live timer
    const taken = Date.now() - startTimeRef.current;
    answerTimesRef.current[currentIndex] = taken;
    setAnswerTime(taken);
    clearInterval(tickRef.current);

    const isCorrect = answer === questions[currentIndex].correct_answer;
    const pts = questions[currentIndex].points || 2;
    const newScore = isCorrect ? score + pts : score;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    if (isCorrect) setScore(newScore);
    if (isCorrect) setCorrectCount(newCorrectCount);

    setSelected(answer);
    setShowFeedback(true);

    timerRef.current = setTimeout(async () => {
      setShowFeedback(false);
      setSelected(null);

      const isLast = currentIndex === questions.length - 1;
      if (isLast) {
        // Show interstitial ad before results
        AdInterstitial.show(showAds);
        // Submit game session in background
        try {
          const totalTimeMs = answerTimesRef.current.reduce((sum, value) => sum + value, 0);
          await submitGame(parseInt(categoryId), difficulty, newCorrectCount, questions.length, {
            totalTimeMs,
            answerTimesMs: answerTimesRef.current,
          });
        } catch { /* non-fatal */ }
        router.replace({
          pathname: '/(app)/results',
          params: {
            score: newCorrectCount,
            points: newScore,
            total: questions.length,
            categoryId,
            categoryName,
            difficulty,
          },
        });
      } else {
        setCurrentIndex((i) => i + 1);
      }
    }, ANSWER_REVEAL_DELAY_MS);
  };

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading questions…</Text>
      </SafeAreaView>
    );
  }

  if (error || !questions.length) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error || 'No questions found.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const q = questions[currentIndex];
  const progress = (currentIndex + 1) / questions.length;

  // ── Option button color logic ────────────────────────────────────────────────
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

        {/* Header */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.progress}>
            {currentIndex + 1} / {questions.length}
          </Text>
          <View style={styles.scorePill}>
            <Text style={styles.scoreText}>⭐ {score}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {/* Category + difficulty + points label */}
        <Text style={styles.meta}>
          {categoryName} · {difficulty === 'any' ? 'Mixed' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} · ⭐ {q.points || 2} pts
        </Text>

        {/* Timer */}
        {showQuestionTimer && <View style={styles.timerRow}>
          <Text style={[
            styles.timerText,
            answerTime !== null && styles.timerDone,
          ]}>
            {answerTime !== null
              ? `⏱ Answered in ${(answerTime / 1000).toFixed(1)}s`
              : `⏱ ${(elapsed / 1000).toFixed(1)}s`
            }
          </Text>
        </View>}

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{q.question}</Text>
        </View>

        {/* Answer options */}
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

        {/* Ad banner every 3rd question */}
        {showAds && (currentIndex + 1) % 3 === 0 && (
          <AdBanner enabled={showAds} />
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: COLORS.background },
  container: {
    padding: 20,
    paddingBottom: 40,
    ...Platform.select({
      web: {
        maxWidth: 640,
        width: '100%',
        alignSelf: 'center',
      },
    }),
  },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backLink: { fontSize: 20, color: COLORS.textSecondary, padding: 4 },
  progress: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  scorePill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scoreText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  progressBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },

  meta: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '600' },

  timerRow: { marginBottom: 16, alignItems: 'flex-start' },
  timerText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  timerDone: { color: COLORS.primary, fontWeight: '700' },

  questionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  questionText: { fontSize: 18, fontWeight: '600', color: COLORS.text, lineHeight: 26 },

  options: { gap: 10 },
  option: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionCorrect: { backgroundColor: COLORS.successLight, borderColor: COLORS.success },
  optionWrong:   { backgroundColor: COLORS.errorLight,   borderColor: COLORS.error },
  optionDimmed:  { opacity: 0.5 },
  optionText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  optionTextActive: { fontWeight: '700' },
  optionTextDimmed: { color: COLORS.textSecondary },

  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 15 },
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', marginBottom: 16 },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: { color: COLORS.white, fontWeight: '700' },
});
