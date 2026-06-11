import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function Dashboard() {
  const [stats, setStats] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ingestState, setIngestState] = useState({}); // { [slug]: { loading, msg, error } }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, summaryRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/dashboard'),
      ]);
      setStats(statsRes.data.stats);
      setSummary(summaryRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function ingest(slug, amount = 50) {
    setIngestState((s) => ({ ...s, [slug]: { loading: true, msg: '', error: '' } }));
    try {
      const { data } = await api.post('/admin/ingest', { category: slug, amount });
      setIngestState((s) => ({ ...s, [slug]: { loading: false, msg: `✅ ${data.inserted} inserted, ${data.skipped} skipped`, error: '' } }));
      load();
    } catch (err) {
      const raw = err?.response?.data?.error || 'Ingest failed';
      const friendly = raw.includes('429')
        ? 'OpenTDB rate limit hit — please wait 10 seconds and try again.'
        : raw;
      setIngestState((s) => ({ ...s, [slug]: { loading: false, msg: '', error: friendly } }));
    }
  }

  const totalQuestions = stats.reduce((sum, s) => sum + s.total, 0);

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>🔄 Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="stat-grid" style={{ marginBottom: 8 }}>
        <div className="stat-card">
          <div className="stat-num">{summary?.categories.enabled ?? '—'}</div>
          <div className="stat-label">Active Categories</div>
          <div className="stat-sub">{summary ? `${summary.categories.total} total` : ''}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{summary?.questions.total ?? '—'}</div>
          <div className="stat-label">Total Questions</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{summary?.players.registered ?? '—'}</div>
          <div className="stat-label">Registered Players</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: summary?.activeSessions > 0 ? 'var(--success)' : undefined }}>
            {summary?.activeSessions ?? '—'}
          </div>
          <div className="stat-label">Playing Now</div>
          <div className="stat-sub">sessions in last 15 min</div>
        </div>
      </div>

      {/* Per-category breakdown */}
      <p className="section-heading" style={{ marginBottom: 12 }}>Questions by Category</p>
      <div className="stat-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.id}>
            <div className="stat-num">{s.total}</div>
            <div className="stat-label">{s.name}</div>
            <div className="stat-sub">
              {DIFFICULTIES.map((d) => `${d}: ${s.counts[d] || 0}`).join(' · ')}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 16 }}>Quick Ingest (50 questions per category)</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
          Fetches questions from OpenTDB and stores them locally. Duplicates are automatically skipped.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {stats.map((s) => {
            const state = ingestState[s.slug] || {};
            return (
              <div key={s.slug} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => ingest(s.slug)}
                  disabled={state.loading}
                >
                  {state.loading ? 'Ingesting…' : `+ ${s.name}`}
                </button>
                {state.msg && <span style={{ fontSize: 12, color: 'var(--success)' }}>{state.msg}</span>}
                {state.error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{state.error}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
