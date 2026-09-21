import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { getAdminToken, clearAdminToken } from './api.js';
import Login from './pages/Login.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Categories from './pages/Categories.jsx';
import Questions from './pages/Questions.jsx';
import AdSettings from './pages/AdSettings.jsx';
import MultiplayerRooms from './pages/MultiplayerRooms.jsx';
import Account from './pages/Account.jsx';

function RequireAuth({ children }) {
  return getAdminToken() ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  function handleLogout() {
    clearAdminToken();
    window.location.href = '/login';
  }
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          🎯 QuizBlitz
          <span>Admin Panel</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard">📊 Dashboard</NavLink>
          <NavLink to="/categories">🗂️ Categories</NavLink>
          <NavLink to="/questions">❓ Questions</NavLink>
          <NavLink to="/ad-settings">📢 Ad Settings</NavLink>
          <NavLink to="/multiplayer-rooms">🎮 Multiplayer</NavLink>
          <NavLink to="/account">👤 Account</NavLink>
          <a href="http://localhost:8081" target="_blank" rel="noreferrer" style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
            🎮 Play Game ↗
          </a>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout}>🚪 Log Out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><Layout><Dashboard /></Layout></RequireAuth>} />
        <Route path="/categories" element={<RequireAuth><Layout><Categories /></Layout></RequireAuth>} />
        <Route path="/questions" element={<RequireAuth><Layout><Questions /></Layout></RequireAuth>} />
        <Route path="/ad-settings" element={<RequireAuth><Layout><AdSettings /></Layout></RequireAuth>} />
        <Route path="/multiplayer-rooms" element={<RequireAuth><Layout><MultiplayerRooms /></Layout></RequireAuth>} />
        <Route path="/account" element={<RequireAuth><Layout><Account /></Layout></RequireAuth>} />
        <Route path="*" element={<Navigate to={getAdminToken() ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
