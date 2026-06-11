import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const EMPTY_FORM = { category_id: '', difficulty: 'medium', question_text: '', correct_answer: '', incorrect_answers: ['', '', ''], points: 2 };

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const [filters, setFilters] = useState({ search: '', categoryId: '', difficulty: '' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { api.get('/admin/categories').then(({ data }) => setCategories(data.categories)); }, []);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: LIMIT };
      if (filters.search) params.search = filters.search;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      const { data } = await api.get('/admin/questions', { params });
      setQuestions(data.questions);
      setTotal(data.total);
    } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(page); }, [page]);

  function applyFilters(e) { e.preventDefault(); setPage(1); load(1); }

  function openAdd() {
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id || '' });
    setError(''); setModal({ mode: 'add' });
  }
  function openEdit(q) {
    const raw = q.incorrect_answers_json;
    const parsedAnswers = Array.isArray(raw)
      ? raw
      : (typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : []);
    setForm({
      category_id: q.category_id,
      difficulty: q.difficulty,
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      incorrect_answers: [...parsedAnswers, '', '', ''].slice(0, 3),
      points: q.points ?? 2,
    });
    setError(''); setModal({ mode: 'edit', id: q.id });
  }
  function closeModal() { setModal(null); }

  function setIncorrect(idx, val) {
    setForm((f) => {
      const arr = [...f.incorrect_answers];
      arr[idx] = val;
      return { ...f, incorrect_answers: arr };
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    const incorrect = form.incorrect_answers.filter((a) => a.trim());
    if (!form.category_id || !form.question_text.trim() || !form.correct_answer.trim() || incorrect.length < 1)
      return setError('Category, question, correct answer, and at least 1 incorrect answer are required.');
    setSaving(true); setError('');
    try {
      const payload = {
        category_id: parseInt(form.category_id),
        difficulty: form.difficulty,
        question_text: form.question_text,
        correct_answer: form.correct_answer,
        incorrect_answers: incorrect,
        points: parseInt(form.points) || 2,
      };
      if (modal.mode === 'add') await api.post('/admin/questions', payload);
      else await api.put(`/admin/questions/${modal.id}`, payload);
      setSuccess(modal.mode === 'add' ? 'Question created.' : 'Question updated.');
      closeModal(); load(page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleDelete(q) {
    if (!confirm('Delete this question?')) return;
    try {
      await api.delete(`/admin/questions/${q.id}`);
      setSuccess('Question deleted.'); load(page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert(err?.response?.data?.error || 'Delete failed.'); }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <div className="page-header">
        <h1>Questions <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>({total} total)</span></h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Question</button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      <form className="filters" onSubmit={applyFilters}>
        <input
          placeholder="Search question text…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <select value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.difficulty} onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))}>
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button type="submit" className="btn btn-ghost">Search</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
          <tr><th>ID</th><th>Category</th><th>Difficulty</th><th>Pts</th><th style={{ minWidth: 320 }}>Question</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Loading…</td></tr>
            ) : questions.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>No questions found.</td></tr>
            ) : questions.map((q) => (
              <tr key={q.id}>
                <td style={{ color: 'var(--text-secondary)' }}>{q.id}</td>
                <td>{q.category?.name || '—'}</td>
                <td><span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span></td>
                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{q.points ?? 2}</td>
                <td style={{ fontSize: 13, maxWidth: 380 }}>{q.question_text.length > 100 ? q.question_text.slice(0, 100) + '…' : q.question_text}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(q)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(q)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.mode === 'add' ? 'Add Question' : 'Edit Question'}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Category *</label>
                <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Select…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Difficulty *</label>
                <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="form-group">
                <label>Question *</label>
                <textarea value={form.question_text} onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))} placeholder="Enter the question…" />
              </div>
              <div className="form-group">
                <label>Correct Answer *</label>
                <input value={form.correct_answer} onChange={(e) => setForm((f) => ({ ...f, correct_answer: e.target.value }))} placeholder="The correct answer" />
              </div>
              <div className="form-group">
                <label>Points Value</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.points}
                  onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
                />
              </div>
              {[0, 1, 2].map((i) => (
                <div className="form-group" key={i}>
                  <label>Incorrect Answer {i + 1}{i === 0 ? ' *' : ' (optional)'}</label>
                  <input value={form.incorrect_answers[i]} onChange={(e) => setIncorrect(i, e.target.value)} placeholder={`Wrong answer ${i + 1}`} />
                </div>
              ))}
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
