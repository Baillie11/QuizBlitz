import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('adminToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export function setAdminToken(token) { sessionStorage.setItem('adminToken', token); }
export function clearAdminToken() { sessionStorage.removeItem('adminToken'); sessionStorage.removeItem('adminUser'); }
export function getAdminToken() { return sessionStorage.getItem('adminToken'); }
export function setAdminUser(user) { sessionStorage.setItem('adminUser', JSON.stringify(user)); }
export function getAdminUser() {
  try { return JSON.parse(sessionStorage.getItem('adminUser')); } catch { return null; }
}
