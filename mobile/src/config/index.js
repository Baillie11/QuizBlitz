// All EXPO_PUBLIC_ vars are inlined at build time by Expo.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export const QUESTIONS_PER_GAME = 10;

// How long (ms) to show correct/wrong feedback before advancing to the next question
export const ANSWER_REVEAL_DELAY_MS = 1300;

export const COLORS = {
  primary: '#6C47FF',
  primaryDark: '#5835E0',
  primaryLight: '#EDE9FF',
  background: '#F0F2FF',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#64648A',
  success: '#22C55E',
  successLight: '#DCFCE7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  border: '#E5E7EB',
  white: '#FFFFFF',
};
