const router = require('express').Router();
const { fn, col, Op } = require('sequelize');
const crypto = require('crypto');
const adminAuth = require('../middleware/adminJwt');
const { ingestQuestions } = require('../services/ingestionService');
const { Question, Category, QuestionSource, sequelize } = require('../models');

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashQuestion(sourceId, text) {
  return crypto.createHash('sha256').update(`${sourceId}:${text}`).digest('hex');
}

async function getManualSource() {
  const [source] = await QuestionSource.findOrCreate({
    where: { name: 'Manual' },
    defaults: { name: 'Manual', base_url: 'manual', notes: 'Manually entered questions' },
  });
  return source;
}

// POST /admin/ingest
// Header: X-Admin-Api-Key
// Body: { category (slug), difficulty?, amount? }
router.post('/ingest', adminAuth, async (req, res) => {
  const { category, difficulty, amount = 50 } = req.body;
  if (!category) return res.status(400).json({ error: 'category (slug) is required' });

  try {
    const result = await ingestQuestions({
      categorySlug: category,
      difficulty: difficulty && difficulty !== 'any' ? difficulty : undefined,
      amount: parseInt(amount),
    });
    return res.json({ message: 'Ingestion complete', ...result });
  } catch (err) {
    console.error('[admin/ingest]', err);
    return res.status(500).json({ error: err.message || 'Ingestion failed' });
  }
});

// GET /admin/dashboard – summary counts for the dashboard
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const [[catRow]]  = await sequelize.query('SELECT COUNT(*) as total, SUM(is_enabled) as enabled FROM categories');
    const [[userRow]] = await sequelize.query('SELECT COUNT(*) as total FROM users');
    const [[qRow]]    = await sequelize.query('SELECT COUNT(*) as total FROM questions');
    const [[activeRow]] = await sequelize.query(
      "SELECT COUNT(DISTINCT COALESCE(user_id, -id)) as total FROM game_sessions WHERE started_at >= NOW() - INTERVAL 15 MINUTE"
    );
    return res.json({
      categories:    { total: parseInt(catRow.total),  enabled: parseInt(catRow.enabled) },
      questions:     { total: parseInt(qRow.total) },
      players:       { registered: parseInt(userRow.total) },
      activeSessions: parseInt(activeRow.total),
    });
  } catch (err) {
    console.error('[admin/dashboard]', err);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /admin/stats
// Header: X-Admin-Api-Key
// Returns question counts per category and difficulty.
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const categories = await Category.findAll();

    const stats = await Promise.all(
      categories.map(async (cat) => {
        const rows = await Question.findAll({
          where: { category_id: cat.id },
          attributes: ['difficulty', [fn('COUNT', col('id')), 'count']],
          group: ['difficulty'],
          raw: true,
        });

        const counts = rows.reduce((acc, r) => {
          acc[r.difficulty] = parseInt(r.count);
          return acc;
        }, {});

        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          counts,
          total: rows.reduce((sum, r) => sum + parseInt(r.count), 0),
        };
      })
    );

    return res.json({ stats });
  } catch (err) {
    console.error('[admin/stats]', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Categories CRUD ───────────────────────────────────────────────────────────

// GET /admin/categories
router.get('/categories', adminAuth, async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    return res.json({ categories });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /admin/categories
router.post('/categories', adminAuth, async (req, res) => {
  const { name, slug, external_id } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
  try {
    const category = await Category.create({ name, slug, external_id: external_id || null });
    return res.status(201).json({ category });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'Slug already exists' });
    return res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /admin/categories/:id
router.put('/categories/:id', adminAuth, async (req, res) => {
  const { name, slug, external_id, is_enabled } = req.body;
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    if (name !== undefined) category.name = name;
    if (slug !== undefined) category.slug = slug;
    if (external_id !== undefined) category.external_id = external_id || null;
    if (is_enabled !== undefined) category.is_enabled = is_enabled;
    await category.save();
    return res.json({ category });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'Slug already exists' });
    return res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /admin/categories/:id
router.delete('/categories/:id', adminAuth, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    const qCount = await Question.count({ where: { category_id: category.id } });
    if (qCount > 0) return res.status(409).json({ error: `Cannot delete: category has ${qCount} question(s). Delete them first.` });
    await category.destroy();
    return res.json({ message: 'Category deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ── Questions CRUD ────────────────────────────────────────────────────────────

// GET /admin/questions?page=1&limit=20&categoryId=&difficulty=&search=
router.get('/questions', adminAuth, async (req, res) => {
  const { page = 1, limit = 20, categoryId, difficulty, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = {};
  if (categoryId) where.category_id = parseInt(categoryId);
  if (difficulty && difficulty !== 'any') where.difficulty = difficulty;
  if (search) where.question_text = { [Op.like]: `%${search}%` };
  try {
    const { count, rows } = await Question.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
      order: [['id', 'DESC']],
      limit: parseInt(limit),
      offset,
    });
    // Ensure incorrect_answers_json is always a parsed array, never a raw string
    const questions = rows.map((q) => {
      const obj = q.toJSON();
      if (typeof obj.incorrect_answers_json === 'string') {
        try { obj.incorrect_answers_json = JSON.parse(obj.incorrect_answers_json); } catch { obj.incorrect_answers_json = []; }
      }
      return obj;
    });
    return res.json({ total: count, page: parseInt(page), limit: parseInt(limit), questions });
  } catch (err) {
    console.error('[admin/questions GET]', err);
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// POST /admin/questions
router.post('/questions', adminAuth, async (req, res) => {
  const { category_id, difficulty = 'medium', question_text, correct_answer, incorrect_answers, points = 2 } = req.body;
  if (!category_id || !question_text || !correct_answer || !incorrect_answers?.length)
    return res.status(400).json({ error: 'category_id, question_text, correct_answer, incorrect_answers are required' });
  try {
    const source = await getManualSource();
    const hash = hashQuestion(source.id, question_text);
    const question = await Question.create({
      category_id, source_id: source.id, question_text,
      question_text_hash: hash, difficulty, correct_answer,
      incorrect_answers_json: incorrect_answers,
      points: parseInt(points) || 2,
    });
    return res.status(201).json({ question });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'Duplicate question' });
    console.error('[admin/questions POST]', err);
    return res.status(500).json({ error: 'Failed to create question' });
  }
});

// PUT /admin/questions/:id
router.put('/questions/:id', adminAuth, async (req, res) => {
  const { category_id, difficulty, question_text, correct_answer, incorrect_answers, points } = req.body;
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (category_id !== undefined) question.category_id = category_id;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (correct_answer !== undefined) question.correct_answer = correct_answer;
    if (incorrect_answers !== undefined) question.incorrect_answers_json = incorrect_answers;
    if (points !== undefined) question.points = parseInt(points) || 2;
    if (question_text !== undefined) {
      question.question_text = question_text;
      question.question_text_hash = hashQuestion(question.source_id, question_text);
    }
    await question.save();
    return res.json({ question });
  } catch (err) {
    console.error('[admin/questions PUT]', err);
    return res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /admin/questions/:id
router.delete('/questions/:id', adminAuth, async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    await question.destroy();
    return res.json({ message: 'Question deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete question' });
  }
});

// ── App Settings ──────────────────────────────────────────────────────────────

// GET /admin/settings
router.get('/settings', adminAuth, async (req, res) => {
  try {
    const [rows] = await sequelize.query('SELECT `key`, `value` FROM app_settings ORDER BY `key`');
    const settings = rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
    return res.json({ settings });
  } catch (err) {
    console.error('[admin/settings GET]', err);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /admin/settings – body: { key: value, ... }
router.put('/settings', adminAuth, async (req, res) => {
  const entries = Object.entries(req.body);
  if (!entries.length) return res.status(400).json({ error: 'No settings provided' });
  try {
    for (const [key, value] of entries) {
      await sequelize.query(
        'INSERT INTO app_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?, `updated_at` = NOW()',
        { replacements: [key, value, value] }
      );
    }
    return res.json({ message: 'Settings saved' });
  } catch (err) {
    console.error('[admin/settings PUT]', err);
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;
