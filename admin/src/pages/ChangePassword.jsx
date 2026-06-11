import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAdminToken, getAdminUser, setAdminUser } from '../api.js';

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = getAdminUser();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (newPassword !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      const { data } = await api.put('/admin/auth/change-password', { newPassword });
      setAdminToken(data.token);
      // Update stored user to clear mustChangePassword
      if (user) setAdminUser({ ...user, mustChangePassword: false });
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>🔒 Change Password</h1>
        <p>Welcome, {user?.username || 'Admin'}! You must set a new password before continuing.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(min. 8 characters)</span></label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
