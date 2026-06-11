const router = require('express').Router();
const { Question, GameSession, sequelize } = require('../models');
const { ensureQuestions } = require('../services/ingestionService');
const { optionalAuth } = require('../middleware/auth');

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// POST /game/start
// Body: { categoryId, difficulty?, amount? }
// Returns a batch of questions with shuffled answer options.
router.post('/start', optionalAuth, async (req, res) => {
  const { categoryId, difficulty, amount = 10 } = req.body;
  if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });

  const qty = Math.min(parseInt(amount) || 10, 50);
  const diff = difficulty && difficulty !== 'any' ? difficulty : undefined;

  try {
    // Auto-fetch from OpenTDB if we don't have enough questions locally
    await ensureQuestions({ categoryId: parseInt(categoryId), difficulty: diff, amount: qty });

    const where = { category_id: parseInt(categoryId) };
    if (diff) where.difficulty = diff;

    const questions = await Question.findAll({
      where,
      order: sequelize.random(),
      limit: qty,
    });

    if (!questions.length) {
      return res.status(404).json({ error: 'No questions available for this category/difficulty' });
    }

    const formatted = questions.map((q) => {
      const incorrectAnswers = Array.isArray(q.incorrect_answers_json)
        ? q.incorrect_answers_json
        : (() => { try { return JSON.parse(q.incorrect_answers_json); } catch { return []; } })();
      return {
        id: q.id,
        question: q.question_text,
        // Shuffle all 4 options so the correct answer isn't always last
        options: shuffleArray([q.correct_answer, ...incorrectAnswers]),
        difficulty: q.difficulty,
        points: q.points || 2,
        // Included for Level 1 client-side validation; remove in Level 2 for server-side scoring
        correct_answer: q.correct_answer,
      };
    });

    return res.json({ questions: formatted });
  } catch (err) {
    console.error('[game/start]', err);
    return res.status(500).json({ error: 'Failed to start game' });
  }
});

// POST /game/submit
// Body: { categoryId, difficulty?, score, totalQuestions }
// Saves a summary game session record.
router.post('/submit', optionalAuth, async (req, res) => {
  const { categoryId, difficulty, score, totalQuestions } = req.body;
  if (categoryId == null || score == null || totalQuestions == null) {
    return res
      .status(400)
      .json({ error: 'categoryId, score, and totalQuestions are required' });
  }

  try {
    const session = await GameSession.create({
      user_id: req.user ? req.user.id : null,
      category_id: parseInt(categoryId),
      difficulty: difficulty && difficulty !== 'any' ? difficulty : null,
      score: parseInt(score),
      total_questions: parseInt(totalQuestions),
      started_at: new Date(),
      finished_at: new Date(),
    });

    return res.status(201).json({
      session: {
        id: session.id,
        score: session.score,
        totalQuestions: session.total_questions,
        percentage: Math.round((session.score / session.total_questions) * 100),
      },
    });
  } catch (err) {
    console.error('[game/submit]', err);
    return res.status(500).json({ error: 'Failed to submit game' });
  }
});

module.exports = router;
