import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

// ── Token storage ─────────────────────────────────────────────────────────────
// expo-secure-store is unavailable on web; fall back to localStorage.
const TOKEN_KEY = 'trivia_auth_token';
const SHOW_QUESTION_TIMER_KEY = 'quizblitz_show_question_timer';

export const tokenStorage = {
  get: async () => {
    if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  set: async (val) => {
    if (Platform.OS === 'web') return localStorage.setItem(TOKEN_KEY, val);
    return SecureStore.setItemAsync(TOKEN_KEY, val);
  },
  delete: async () => {
    if (Platform.OS === 'web') return localStorage.removeItem(TOKEN_KEY);
    return SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

export const timerPreferenceStorage = {
  get: async () => {
    const value = Platform.OS === 'web'
      ? localStorage.getItem(SHOW_QUESTION_TIMER_KEY)
      : await SecureStore.getItemAsync(SHOW_QUESTION_TIMER_KEY);
    return value === 'true';
  },
  set: async (enabled) => {
    const value = enabled ? 'true' : 'false';
    if (Platform.OS === 'web') return localStorage.setItem(SHOW_QUESTION_TIMER_KEY, value);
    return SecureStore.setItemAsync(SHOW_QUESTION_TIMER_KEY, value);
  },
};

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (email, password, displayName) =>
  api.post('/auth/register', { email, password, displayName }).then((r) => r.data);

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const forgotPassword = (email, newPassword) =>
  api.post('/auth/forgot-password', { email, newPassword }).then((r) => r.data);

export const getMe = () => api.get('/auth/me').then((r) => r.data);

export const getProfile = () => api.get('/auth/profile').then((r) => r.data);

export const updateMe = (data) => api.put('/auth/me', data).then((r) => r.data);

export const resetMyPassword = () =>
  api.post('/auth/reset-my-password').then((r) => r.data);

// ── Categories ────────────────────────────────────────────────────────────────
export const getCategories = () => api.get('/categories').then((r) => r.data);

// ── Config ────────────────────────────────────────────────────────────────────
export const getConfig = () => api.get('/config').then((r) => r.data);

// ── Game ──────────────────────────────────────────────────────────────────────
export const startGame = (categoryId, difficulty, amount) =>
  api.post('/game/start', { categoryId, difficulty, amount }).then((r) => r.data);

export const submitGame = (categoryId, difficulty, score, totalQuestions, timing = {}) =>
  api.post('/game/submit', { categoryId, difficulty, score, totalQuestions, ...timing }).then((r) => r.data);

// ── Multiplayer ───────────────────────────────────────────────────────────────────
export const getMultiplayerRooms = () =>
  api.get('/multiplayer/rooms').then((r) => r.data);

export const joinMultiplayerRoom = (roomId, displayName) =>
  api.post(`/multiplayer/rooms/${roomId}/join`, { displayName }).then((r) => r.data);

export const getMultiplayerRoom = (roomId) =>
  api.get(`/multiplayer/rooms/${roomId}`).then((r) => r.data);

export const submitMultiplayerAnswer = (roomId, playerId, score) =>
  api.post(`/multiplayer/rooms/${roomId}/answer`, { playerId, score }).then((r) => r.data);

export const finishMultiplayerGame = (roomId, playerId, score) =>
  api.post(`/multiplayer/rooms/${roomId}/finish`, { playerId, score }).then((r) => r.data);

export default api;
