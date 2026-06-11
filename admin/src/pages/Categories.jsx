import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const EMPTY = { name: '', slug: '', external_id: '' };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [qCounts, setQCounts] = useState({});   // { [categoryId]: total }
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'id'
  const [sortDir, setSortDir] = useState('asc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, statsRes] = await Promise.allSettled([
        api.get('/admin/categories'),
        api.get('/admin/stats'),
      ]);
      if (catRes.status === 'fulfilled') setCategories(catRes.value.data.categories);
      if (statsRes.status === 'fulfilled') {
        const counts = {};
        statsRes.value.data.stats.forEach((s) => { counts[s.id] = s.total; });
        setQCounts(counts);
      }
    } finally { setLoading(false); }
  }, []);

  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  const sorted = [...categories].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'id') return (a.id - b.id) * dir;
    return a.name.localeCompare(b.name) * dir;
  });

  function SortIcon({ col }) {
    if (sortBy !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>⇕</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(EMPTY); setError(''); setModal({ mode: 'add' }); }
  function openEdit(cat) { setForm({ name: cat.name, slug: cat.slug, external_id: cat.external_id ?? '' }); setError(''); setModal({ mode: 'edit', id: cat.id }); }
  function closeModal() { setModal(null); }

  function field(key) { return (e) => setForm((f) => ({ ...f, [key]: e.target.value })); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return setError('Name and slug are required.');
    setSaving(true); setError('');
    try {
      if (modal.mode === 'add') {
        await api.post('/admin/categories', { name: form.name, slug: form.slug, external_id: form.external_id || null });
        setSuccess('Category created.');
      } else {
        await api.put(`/admin/categories/${modal.id}`, { name: form.name, slug: form.slug, external_id: form.external_id || null });
        setSuccess('Category updated.');
      }
      closeModal(); load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleToggle(cat) {
    try {
      await api.put(`/admin/categories/${cat.id}`, { is_enabled: cat.is_enabled ? 0 : 1 });
      load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Update failed.');
    }
  }

  async function handleDelete(cat) {
    if (!confirm(`Delete category "${cat.name}"? This will fail if it has questions.`)) return;
    try {
      await api.delete(`/admin/categories/${cat.id}`);
      setSuccess('Category deleted.'); load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      alert(err?.response?.data?.error || 'Delete failed.');
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Categories</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Category</button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('id')}>
                ID <SortIcon col="id" />
              </th>
              <th>Active</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('name')}>
                Name <SortIcon col="name" />
              </th>
              <th>Slug</th>
              <th>Questions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Loading…</td></tr>
            ) : sorted.map((cat) => {
              const count = qCounts[cat.id] ?? null;
              return (
              <tr key={cat.id}>
                <td style={{ color: 'var(--text-secondary)' }}>{cat.id}</td>
                <td>
                  <label className="toggle" title={cat.is_enabled ? 'Disable' : 'Enable'}>
                    <input type="checkbox" checked={!!cat.is_enabled} onChange={() => handleToggle(cat)} />
                    <span className="toggle-slider" />
                  </label>
                </td>
                <td><strong>{cat.name}</strong></td>
                <td><code style={{ fontSize: 12 }}>{cat.slug}</code></td>
                <td>
                  {count === null ? (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>—</span>
                  ) : count === 0 ? (
                    <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13 }} title="No questions — go to Dashboard to ingest from OpenTDB">
                      ⚠️ No questions
                    </span>
                  ) : count < 10 ? (
                    <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: 13 }} title="Fewer than 10 questions — may not have enough to play">
                      ⚠️ {count} (need 10+)
                    </span>
                  ) : (
                    <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: 13 }}>
                      ✅ {count}
                    </span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(cat)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat)}>Delete</button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.mode === 'add' ? 'Add Category' : 'Edit Category'}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Name *</label>
                <input value={form.name} onChange={field('name')} placeholder="e.g. Science" />
              </div>
              <div className="form-group">
                <label>Slug *</label>
                <input value={form.slug} onChange={field('slug')} placeholder="e.g. science" />
              </div>
              <div className="form-group">
                <label>OpenTDB External ID <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span></label>
                <input value={form.external_id} onChange={field('external_id')} type="number" placeholder="e.g. 17" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
