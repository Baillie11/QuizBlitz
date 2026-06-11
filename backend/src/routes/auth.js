const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
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
  const { displayName, adOptOut, preferredCategories } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

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
