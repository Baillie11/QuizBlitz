import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const EMPTY_SCHED = { name:'', category_id:'', difficulty:'', max_players:'', min_players:'', start_threshold_percent:'', schedule_type:'daily', schedule_time:'09:00', schedule_day:'2', schedule_date:'' };

const STATUS_COLORS = {
  waiting:     { bg: '#DBEAFE', color: '#1D4ED8' },
  in_progress: { bg: '#DCFCE7', color: '#15803D' },
  completed:   { bg: '#F3F4F6', color: '#6B7280' },
  cancelled:   { bg: '#FEE2E2', color: '#DC2626' },
};

const EMPTY_FORM = { name: '', category_id: '', difficulty: '', max_players: '', min_players: '', start_threshold_percent: '' };
const EMPTY_EDIT = { name: '', category_id: '', difficulty: '', max_players: '', min_players: '', start_threshold_percent: '' };

export default function MultiplayerRooms() {
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [defaults, setDefaults] = useState({ max: 10, min: 2, threshold: 80 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qCounts, setQCounts] = useState({});
  const [ingestState, setIngestState] = useState({});
  const [editModal, setEditModal] = useState(null); // null | room
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Schedules state
  const [schedules, setSchedules] = useState([]);
  const [showSchedForm, setShowSchedForm] = useState(false);
  const [schedForm, setSchedForm] = useState(EMPTY_SCHED);
  const [schedModal, setSchedModal] = useState(null); // null | { mode:'add'|'edit', id? }
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedError, setSchedError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, catRes, settingsRes, schedRes] = await Promise.allSettled([
        api.get('/admin/multiplayer/rooms'),
        api.get('/admin/categories'),
        api.get('/admin/settings'),
        api.get('/admin/multiplayer/schedules'),
      ]);
      if (roomsRes.status === 'fulfilled')   setRooms(roomsRes.value.data.rooms);
      if (catRes.status === 'fulfilled')     setCategories(catRes.value.data.categories);
      if (schedRes.status === 'fulfilled')   setSchedules(schedRes.value.data.schedules);
      try {
        const statsRes = await api.get('/admin/stats');
        const counts = {};
        statsRes.data.stats.forEach((s) => { counts[s.id] = s.total; });
        setQCounts(counts);
      } catch { /* non-fatal */ }
      if (settingsRes.status === 'fulfilled') {
        const s = settingsRes.value.data.settings;
        setDefaults({
          max: s.multiplayer_default_max_players || 10,
          min: s.multiplayer_min_players || 2,
          threshold: s.multiplayer_start_threshold_percent || 80,
        });
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5s
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  function field(k) { return (e) => setForm((f) => ({ ...f, [k]: e.target.value })); }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.category_id) return setError('Name and category are required.');
    setSaving(true); setError('');
    try {
      await api.post('/admin/multiplayer/rooms', {
        name: form.name,
        category_id: form.category_id,
        difficulty: form.difficulty || null,
        max_players: form.max_players || undefined,
        min_players: form.min_players || undefined,
        start_threshold_percent: form.start_threshold_percent || undefined,
      });
      setSuccess('Room created.'); setShowForm(false); setForm(EMPTY_FORM); load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create room.');
    } finally { setSaving(false); }
  }

  async function handleStart(room) {
    if (!confirm(`Force-start "${room.name}"?`)) return;
    try {
      await api.post(`/admin/multiplayer/rooms/${room.id}/start`);
      setSuccess('Room started.'); load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert(err?.response?.data?.error || 'Failed to start room.'); }
  }

  // ── Schedule handlers ──────────────────────────────────────────────────────
  function sfld(k) { return (e) => setSchedForm((f) => ({ ...f, [k]: e.target.value })); }

  function openAddSched() { setSchedForm(EMPTY_SCHED); setSchedError(''); setSchedModal({ mode: 'add' }); }
  function openEditSched(s) {
    setSchedForm({
      name: s.name, category_id: s.category_id, difficulty: s.difficulty || '',
      max_players: s.max_players, min_players: s.min_players,
      start_threshold_percent: s.start_threshold_percent,
      schedule_type: s.schedule_type,
      schedule_time: s.schedule_time?.slice(0,5) || '09:00',
      schedule_day: s.schedule_day ?? '2',
      schedule_date: s.schedule_date || '',
    });
    setSchedError(''); setSchedModal({ mode: 'edit', id: s.id });
  }

  async function handleSaveSched(e) {
    e.preventDefault();
    setSchedSaving(true); setSchedError('');
    try {
      const payload = { ...schedForm,
        schedule_day: schedForm.schedule_type === 'weekly' ? parseInt(schedForm.schedule_day) : null,
        schedule_date: schedForm.schedule_type === 'once' ? schedForm.schedule_date : null,
      };
      if (schedModal.mode === 'add') await api.post('/admin/multiplayer/schedules', payload);
      else await api.put(`/admin/multiplayer/schedules/${schedModal.id}`, payload);
      setSchedModal(null); setSuccess('Schedule saved.'); load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setSchedError(err?.response?.data?.error || 'Save failed.');
    } finally { setSchedSaving(false); }
  }

  async function handleToggleSched(s) {
    try {
      await api.put(`/admin/multiplayer/schedules/${s.id}`, { is_active: !s.is_active });
      load();
    } catch (err) { alert(err?.response?.data?.error || 'Update failed.'); }
  }

  async function handleDeleteSched(s) {
    if (!confirm(`Delete schedule "${s.name}"?`)) return;
    try {
      await api.delete(`/admin/multiplayer/schedules/${s.id}`);
      setSuccess('Schedule deleted.'); load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert(err?.response?.data?.error || 'Delete failed.'); }
  }

  function formatSchedule(s) {
    const time = s.schedule_time?.slice(0,5) || '';
    if (s.schedule_type === 'daily')  return `Daily at ${time}`;
    if (s.schedule_type === 'weekly') return `Every ${DAYS[s.schedule_day] || ''} at ${time}`;
    if (s.schedule_type === 'once')   return `Once on ${s.schedule_date} at ${time}`;
    return time;
  }

  function openEdit(room) {
    setEditForm({
      name: room.name, category_id: room.category_id, difficulty: room.difficulty || '',
      max_players: room.max_players, min_players: room.min_players,
      start_threshold_percent: room.start_threshold_percent,
    });
    setEditError(''); setEditModal(room);
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setEditSaving(true); setEditError('');
    try {
      await api.put(`/admin/multiplayer/rooms/${editModal.id}`, editForm);
      setEditModal(null); setSuccess('Room updated.'); load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Save failed.');
    } finally { setEditSaving(false); }
  }

  async function handleHardDelete(room) {
    if (!confirm(`Permanently delete "${room.name}" and all its player records? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/multiplayer/rooms/${room.id}?hard=true`);
      setSuccess('Room deleted.'); load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert(err?.response?.data?.error || 'Delete failed.'); }
  }

  async function handleIngest(categoryId, categorySlug) {
    setIngestState((s) => ({ ...s, [categoryId]: { loading: true, msg: '', error: '' } }));
    try {
      const { data } = await api.post('/admin/ingest', { category: categorySlug, amount: 50 });
      setIngestState((s) => ({ ...s, [categoryId]: { loading: false, msg: `✅ ${data.inserted} inserted, ${data.skipped} skipped`, error: '' } }));
      const statsRes = await api.get('/admin/stats');
      const counts = {};
      statsRes.data.stats.forEach((s) => { counts[s.id] = s.total; });
      setQCounts(counts);
    } catch (err) {
      const raw = err?.response?.data?.error || 'Ingest failed';
      setIngestState((s) => ({ ...s, [categoryId]: { loading: false, msg: '', error: raw.includes('429') ? 'Rate limited — wait 10s and retry.' : raw } }));
    }
  }

  async function handleCancel(room) {
    if (!confirm(`Cancel "${room.name}"? Players will be removed.`)) return;
    try {
      await api.delete(`/admin/multiplayer/rooms/${room.id}`);
      setSuccess('Room cancelled.'); load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert(err?.response?.data?.error || 'Failed to cancel room.'); }
  }

  return (
    <>
      <div className="page-header">
        <h1>Multiplayer Rooms</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>🔄 Refresh</button>
          <button className="btn btn-primary" onClick={() => { setShowForm((v) => !v); setError(''); }}>
            {showForm ? '✕ Cancel' : '+ Create Room'}
          </button>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      {/* Create room form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>New Room</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Room Name *</label>
                <input value={form.name} onChange={field('name')} placeholder="e.g. Friday Night Trivia" />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select value={form.category_id} onChange={field('category_id')}>
                  <option value="">Select category…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Difficulty</label>
                <select value={form.difficulty} onChange={field('difficulty')}>
                  <option value="">Any (mixed)</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="form-group">
                <label>Max Players <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(default: {defaults.max})</span></label>
                <input type="number" min="2" max="100" value={form.max_players} onChange={field('max_players')} placeholder={defaults.max} />
              </div>
              <div className="form-group">
                <label>Min Players to Start <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(default: {defaults.min})</span></label>
                <input type="number" min="1" value={form.min_players} onChange={field('min_players')} placeholder={defaults.min} />
              </div>
              <div className="form-group">
                <label>Auto-start threshold % <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(default: {defaults.threshold}%)</span></label>
                <input type="number" min="1" max="100" value={form.start_threshold_percent} onChange={field('start_threshold_percent')} placeholder={defaults.threshold} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Room'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Rooms table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Room</th><th>Category</th><th>Difficulty</th>
              <th>Players</th><th>Auto-start</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Loading…</td></tr>
            ) : rooms.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>No rooms yet. Create one above.</td></tr>
            ) : rooms.map((room) => {
              const sc = STATUS_COLORS[room.status] || STATUS_COLORS.waiting;
              const threshold = Math.ceil(room.max_players * room.start_threshold_percent / 100);
              return (
                <tr key={room.id}>
                  <td><strong>{room.name}</strong><br /><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>ID: {room.id}</span></td>
                  <td>
                    <div>{room.category_name}</div>
                    <div style={{ fontSize: 11, marginTop: 3 }}>
                      {(() => {
                        const count = qCounts[room.category_id];
                        if (count == null) return null;
                        if (count === 0) return (
                          <span style={{ fontWeight: 600, color: 'var(--danger)' }}
                            title="This category has no questions. Click '+ Questions' to fetch from OpenTDB, or add manually via Questions page.">
                            ⚠️ No questions — game cannot start
                          </span>
                        );
                        if (count < 10) return (
                          <span style={{ fontWeight: 600, color: 'var(--warning)' }}
                            title="Fewer than 10 questions available. A game needs at least 10. Click '+ Questions' to add more.">
                            ⚠️ Only {count} question{count !== 1 ? 's' : ''} — need at least 10
                          </span>
                        );
                        return (
                          <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                            ✅ {count} questions ready
                          </span>
                        );
                      })()}
                    </div>
                    {ingestState[room.category_id]?.msg && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 2 }}>{ingestState[room.category_id].msg}</div>}
                    {ingestState[room.category_id]?.error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{ingestState[room.category_id].error}</div>}
                  </td>
                  <td>{room.difficulty || <span style={{ color: 'var(--text-secondary)' }}>Mixed</span>}</td>
                  <td>
                    <strong>{room.player_count}</strong> / {room.max_players}
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      min: {room.min_players}
                    </div>
                  </td>
                  <td>
                    {threshold} players ({room.start_threshold_percent}%)
                  </td>
                  <td>
                    <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                      {room.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {room.status === 'waiting' && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => handleStart(room)}>▶ Start</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(room)}>Edit</button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleIngest(room.category_id, room.category_slug)}
                            disabled={ingestState[room.category_id]?.loading}
                            title="Fetch 50 more questions from OpenTDB"
                          >
                            {ingestState[room.category_id]?.loading ? '⏳…' : '+ Questions'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(room)}>Cancel</button>
                        </>
                      )}
                      {room.status === 'in_progress' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(room)}>Stop</button>
                      )}
                      {(room.status === 'completed' || room.status === 'cancelled') && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleHardDelete(room)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* ── Schedules Section ───────────────────────────────────────────── */}
      <div style={{ marginTop: 32 }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 18 }}>⏰ Room Schedules</h1>
          <button className="btn btn-primary" onClick={openAddSched}>+ Add Schedule</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
          Schedules automatically create a new room at the configured time. Daily and weekly schedules repeat indefinitely.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Category</th><th>Difficulty</th><th>Schedule</th><th>Last Fired</th><th>Active</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>No schedules yet.</td></tr>
              ) : schedules.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.category_name}</td>
                  <td>{s.difficulty || <span style={{ color: 'var(--text-secondary)' }}>Mixed</span>}</td>
                  <td><strong>{formatSchedule(s)}</strong></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.last_fired_at ? new Date(s.last_fired_at).toLocaleString() : '—'}</td>
                  <td>
                    <label className="toggle">
                      <input type="checkbox" checked={!!s.is_active} onChange={() => handleToggleSched(s)} />
                      <span className="toggle-slider" />
                    </label>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditSched(s)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSched(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Room modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Room: {editModal.name}</h2>
            {editError && <div className="alert alert-error">{editError}</div>}
            <form onSubmit={handleEditSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Room Name *</label>
                  <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select value={editForm.category_id} onChange={(e) => setEditForm((f) => ({ ...f, category_id: e.target.value }))}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Difficulty</label>
                  <select value={editForm.difficulty} onChange={(e) => setEditForm((f) => ({ ...f, difficulty: e.target.value }))}>
                    <option value="">Any (mixed)</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Max Players</label>
                  <input type="number" min="2" value={editForm.max_players} onChange={(e) => setEditForm((f) => ({ ...f, max_players: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Min Players to Start</label>
                  <input type="number" min="1" value={editForm.min_players} onChange={(e) => setEditForm((f) => ({ ...f, min_players: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Auto-start Threshold %</label>
                  <input type="number" min="1" max="100" value={editForm.start_threshold_percent} onChange={(e) => setEditForm((f) => ({ ...f, start_threshold_percent: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {schedModal && (
        <div className="modal-overlay" onClick={() => setSchedModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{schedModal.mode === 'add' ? 'Add Schedule' : 'Edit Schedule'}</h2>
            {schedError && <div className="alert alert-error">{schedError}</div>}
            <form onSubmit={handleSaveSched}>
              <div className="form-group">
                <label>Room Name *</label>
                <input value={schedForm.name} onChange={sfld('name')} placeholder="e.g. Tuesday Night Trivia" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Category *</label>
                  <select value={schedForm.category_id} onChange={sfld('category_id')}>
                    <option value="">Select…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Difficulty</label>
                  <select value={schedForm.difficulty} onChange={sfld('difficulty')}>
                    <option value="">Any (mixed)</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Schedule Type *</label>
                  <select value={schedForm.schedule_type} onChange={sfld('schedule_type')}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly (specific day)</option>
                    <option value="once">Once (specific date)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input type="time" value={schedForm.schedule_time} onChange={sfld('schedule_time')} />
                </div>
                {schedForm.schedule_type === 'weekly' && (
                  <div className="form-group">
                    <label>Day of Week *</label>
                    <select value={schedForm.schedule_day} onChange={sfld('schedule_day')}>
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                )}
                {schedForm.schedule_type === 'once' && (
                  <div className="form-group">
                    <label>Date *</label>
                    <input type="date" value={schedForm.schedule_date} onChange={sfld('schedule_date')} />
                  </div>
                )}
                <div className="form-group">
                  <label>Max Players <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(default: {defaults.max})</span></label>
                  <input type="number" min="2" value={schedForm.max_players} onChange={sfld('max_players')} placeholder={defaults.max} />
                </div>
                <div className="form-group">
                  <label>Min Players <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(default: {defaults.min})</span></label>
                  <input type="number" min="1" value={schedForm.min_players} onChange={sfld('min_players')} placeholder={defaults.min} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setSchedModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={schedSaving}>{schedSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
