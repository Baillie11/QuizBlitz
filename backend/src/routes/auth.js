const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, GameSession, Category } = require('../models');
const { authMiddleware } = require('../middleware/auth');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    isPremium: user.is_premium,
    premiumSource: user.premium_source,
    adOptOut: user.ad_opt_out,
    preferredCategories: user.preferred_categories,
    createdAt: user.created_at,
  };
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      password_hash,
      display_name: displayName || null,
    });

    return res.status(201).json({ token: signToken(user), user: sanitizeUser(user) });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    return res.json({ token: signToken(user), user: sanitizeUser(user) });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

const passwordResetAttempts = new Map();
const PASSWORD_RESET_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

function matchesSecret(value, expected) {
  const supplied = Buffer.from(String(value || ''), 'utf8');
  const configured = Buffer.from(String(expected || ''), 'utf8');
  return supplied.length === configured.length && crypto.timingSafeEqual(supplied, configured);
}

function isResetRateLimited(key) {
  const now = Date.now();
  const recent = (passwordResetAttempts.get(key) || []).filter(
    (attemptedAt) => now - attemptedAt < PASSWORD_RESET_WINDOW_MS
  );
  recent.push(now);
  passwordResetAttempts.set(key, recent);
  return recent.length > PASSWORD_RESET_MAX_ATTEMPTS;
}

// POST /auth/forgot-password
// Closed-beta reset flow. The reset code is configured only on the server and
// can be replaced by an emailed, single-use token before a public launch.
router.post('/forgot-password', async (req, res) => {
  const configuredResetCode = process.env.PASSWORD_RESET_CODE;
  if (!configuredResetCode) {
    return res.status(503).json({ error: 'Password reset is not configured. Please contact support.' });
  }

  const { email, newPassword, resetCode } = req.body;
  if (!email || !newPassword || !resetCode) {
    return res.status(400).json({ error: 'Email, reset code, and a new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const attemptKey = `${req.ip}:${normalizedEmail}`;
  if (isResetRateLimited(attemptKey)) {
    return res.status(429).json({ error: 'Too many reset attempts. Please wait 15 minutes and try again.' });
  }
  if (!matchesSecret(resetCode.trim(), configuredResetCode)) {
    return res.status(400).json({ error: 'Invalid email or reset code' });
  }

  try {
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) return res.status(400).json({ error: 'Invalid email or reset code' });
    user.password_hash = await bcrypt.hash(newPassword, 12);
    await user.save();
    passwordResetAttempts.delete(attemptKey);
    return res.json({ message: 'Password updated. You can now log in.' });
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    return res.status(500).json({ error: 'Password reset failed' });
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /auth/me – update profile fields
router.put('/me', authMiddleware, async (req, res) => {
  const { email, displayName, adOptOut, preferredCategories } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }
      const existing = await User.findOne({ where: { email: normalizedEmail } });
      if (existing && existing.id !== user.id) {
        return res.status(409).json({ error: 'That email address is already in use' });
      }
      user.email = normalizedEmail;
    }
    if (displayName !== undefined) user.display_name = displayName;
    if (adOptOut !== undefined) user.ad_opt_out = Boolean(adOptOut);
    if (preferredCategories !== undefined) user.preferred_categories = preferredCategories;
    await user.save();

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('[update me]', err);
    return res.status(500).json({ error: 'Profile update failed' });
  }
});

// GET /auth/profile - player details, lifetime statistics, and recent games
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const where = { user_id: user.id };
    const [gamesPlayed, totalScore, totalQuestions, totalAnswerTimeMs, sessions] = await Promise.all([
      GameSession.count({ where }),
      GameSession.sum('score', { where }),
      GameSession.sum('total_questions', { where }),
      GameSession.sum('total_time_ms', { where }),
      GameSession.findAll({
        where,
        include: [{ model: Category, as: 'category', attributes: ['name'] }],
        order: [['finished_at', 'DESC'], ['id', 'DESC']],
        limit: 25,
      }),
    ]);

    const correct = Number(totalScore) || 0;
    const answered = Number(totalQuestions) || 0;
    const answerTime = Number(totalAnswerTimeMs) || 0;
    return res.json({
      user: sanitizeUser(user),
      stats: {
        gamesPlayed,
        totalScore: correct,
        totalQuestions: answered,
        accuracy: answered ? Math.round((correct / answered) * 100) : 0,
        totalAnswerTimeMs: answerTime,
        averageAnswerTimeMs: answered ? Math.round(answerTime / answered) : 0,
      },
      history: sessions.map((session) => ({
        id: session.id,
        category: session.category?.name || 'Unknown category',
        difficulty: session.difficulty || 'Mixed',
        score: session.score,
        totalQuestions: session.total_questions,
        percentage: session.total_questions
          ? Math.round((session.score / session.total_questions) * 100)
          : 0,
        totalAnswerTimeMs: session.total_time_ms,
        answerTimesMs: session.answer_times_json || [],
        playedAt: session.finished_at,
      })),
    });
  } catch (err) {
    console.error('[auth/profile]', err);
    return res.status(500).json({ error: 'Failed to load player profile' });
  }
});

// POST /auth/reset-my-password
// Local-dev placeholder: resets the currently logged-in user's password to a
// well-known default. Mirrors POST /admin/auth/reset-my-password.
// Will be replaced with an email-based reset flow once the app goes live.
router.post('/reset-my-password', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.password_hash = await bcrypt.hash('J@yden11', 12);
    await user.save();
    return res.json({ message: 'Password has been reset.' });
  } catch (err) {
    console.error('[auth/reset-my-password]', err);
    return res.status(500).json({ error: 'Password reset failed' });
  }
});

module.exports = router;
