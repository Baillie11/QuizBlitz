import React, { useState } from 'react';
import { api, getAdminUser } from '../api.js';

export default function Account() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const user = getAdminUser();

  async function handleReset() {
    setError(''); setSuccess('');
    const ok = window.confirm(
      'Reset your password to the local-dev default ("J@yden11")?\n\n' +
      'You will need to use this password the next time you log in.'
    );
    if (!ok) return;

    setLoading(true);
    try {
      await api.post('/admin/auth/reset-my-password');
      setSuccess('Password has been reset. Use "J@yden11" on your next login.');
      setTimeout(() => setSuccess(''), 8000);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Account</h1>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <p className="section-heading">Profile</p>
        <div className="form-group">
          <label>Username</label>
          <input value={user?.username || ''} disabled />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input value={user?.email || ''} disabled />
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <p className="section-heading">Password</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 0 }}>
          Clicking the button below will reset your password. Once we go live,
          this will send a reset link to your email address. For now — while
          running locally — your password will be reset to a known default.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? 'Resetting…' : '🔑 Password reset'}
          </button>
        </div>
      </div>
    </>
  );
}
