import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAdminToken, setAdminUser } from '../api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Please enter your email and password.');
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/auth/login', { email: email.trim(), password });
      setAdminToken(data.token);
      setAdminUser(data.user);
      if (data.user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(
        err?.response?.status === 401 ? 'Invalid email or password.' :
        err?.response?.data?.error || 'Could not connect to backend.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    if (!forgotEmail.trim()) return setForgotError('Please enter your email.');
    setForgotError(''); setForgotMsg(''); setForgotLoading(true);
    try {
      const { data } = await api.post('/admin/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotMsg(data.message);
    } catch (err) {
      setForgotError(err?.response?.data?.error || 'Reset failed. Is the backend running?');
    } finally {
      setForgotLoading(false);
    }
  }

  if (forgotMode) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>🔑 Forgot Password</h1>
          <p>Enter your email and your password will be reset to the default. You'll be prompted to change it on next login.</p>
          {forgotError && <div className="alert alert-error">{forgotError}</div>}
          {forgotMsg ? (
            <>
              <div className="alert alert-success">{forgotMsg}</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Your temporary password is: <strong>P@ssword123</strong>
              </p>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setForgotMode(false); setForgotMsg(''); setForgotEmail(''); }}>
                Back to Sign In
              </button>
            </>
          ) : (
            <form onSubmit={handleForgot}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={forgotLoading}>
                {forgotLoading ? 'Resetting…' : 'Reset Password'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => setForgotMode(false)}>
                ← Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>🎯 TriviaApp</h1>
        <p>Admin Panel — sign in to continue</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: 16, padding: 0,
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => { setForgotMode(true); setForgotEmail(email); setForgotError(''); setForgotMsg(''); }}>
            Forgot password?
          </button>
        </form>
      </div>
    </div>
  );
}
