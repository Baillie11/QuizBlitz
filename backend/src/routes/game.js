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
  const { categoryId, difficulty, score, totalQuestions, totalTimeMs, answerTimesMs } = req.body;
  if (categoryId == null || score == null || totalQuestions == null) {
    return res
      .status(400)
      .json({ error: 'categoryId, score, and totalQuestions are required' });
  }

  const parsedScore = parseInt(score);
  const parsedTotal = parseInt(totalQuestions);
  if (!Number.isInteger(parsedScore) || !Number.isInteger(parsedTotal) || parsedTotal < 1) {
    return res.status(400).json({ error: 'Score and totalQuestions must be valid integers' });
  }
  if (parsedScore < 0 || parsedScore > parsedTotal) {
    return res.status(400).json({ error: 'Score must be between 0 and totalQuestions' });
  }
  const parsedAnswerTimes = Array.isArray(answerTimesMs)
    ? answerTimesMs.map(Number)
    : [];
  const validTimings = parsedAnswerTimes.length === parsedTotal
    && parsedAnswerTimes.every((value) => Number.isInteger(value) && value >= 0);
  const parsedTotalTime = Number(totalTimeMs);
  if ((answerTimesMs !== undefined || totalTimeMs !== undefined)
      && (!validTimings || !Number.isInteger(parsedTotalTime) || parsedTotalTime < 0)) {
    return res.status(400).json({ error: 'Game timing data is invalid' });
  }

  try {
    const session = await GameSession.create({
      user_id: req.user ? req.user.id : null,
      category_id: parseInt(categoryId),
      difficulty: difficulty && difficulty !== 'any' ? difficulty : null,
      score: parsedScore,
      total_questions: parsedTotal,
      total_time_ms: totalTimeMs === undefined ? null : parsedTotalTime,
      answer_times_json: answerTimesMs === undefined ? null : parsedAnswerTimes,
      started_at: new Date(),
      finished_at: new Date(),
    });

    return res.status(201).json({
      session: {
        id: session.id,
        score: session.score,
        totalQuestions: session.total_questions,
        percentage: Math.round((session.score / session.total_questions) * 100),
        totalTimeMs: session.total_time_ms,
        answerTimesMs: session.answer_times_json,
      },
    });
  } catch (err) {
    console.error('[game/submit]', err);
    return res.status(500).json({ error: 'Failed to submit game' });
  }
});

module.exports = router;
