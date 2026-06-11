const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const adminJwt = require('../middleware/adminJwt');

function signAdminToken(user) {
  return jwt.sign(
    { type: 'admin', id: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

// POST /admin/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const { sequelize } = require('../models');
    const [rows] = await sequelize.query(
      'SELECT * FROM admin_users WHERE email = ? LIMIT 1',
      { replacements: [email.toLowerCase()] }
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signAdminToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        mustChangePassword: !!user.must_change_password,
      },
    });
  } catch (err) {
    console.error('[admin/auth/login]', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /admin/auth/me
router.get('/me', adminJwt, async (req, res) => {
  try {
    const { sequelize } = require('../models');
    const [rows] = await sequelize.query(
      'SELECT id, email, username, must_change_password FROM admin_users WHERE id = ? LIMIT 1',
      { replacements: [req.adminUser.id] }
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    return res.json({ user: { id: u.id, email: u.email, username: u.username, mustChangePassword: !!u.must_change_password } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /admin/auth/forgot-password
// Resets password to default and forces change on next login.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const { sequelize } = require('../models');
    const [rows] = await sequelize.query(
      'SELECT id FROM admin_users WHERE email = ? LIMIT 1',
      { replacements: [email.toLowerCase()] }
    );
    if (!rows[0]) {
      // Don't reveal whether the email exists
      return res.json({ message: 'If that email exists, the password has been reset.' });
    }
    const hash = await bcrypt.hash('P@ssword123', 12);
    await sequelize.query(
      'UPDATE admin_users SET password_hash = ?, must_change_password = 1 WHERE id = ?',
      { replacements: [hash, rows[0].id] }
    );
    return res.json({ message: 'Password reset to default. You must change it on next login.' });
  } catch (err) {
    console.error('[admin/auth/forgot-password]', err);
    return res.status(500).json({ error: 'Password reset failed' });
  }
});

// PUT /admin/auth/change-password
// If the user is NOT in a forced-reset state, `currentPassword` is required
// and must match. In the forced-reset flow, `currentPassword` is optional
// (the user just came from the /change-password screen immediately post-login).
router.put('/change-password', adminJwt, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });

  try {
    const { sequelize } = require('../models');
    const [rows] = await sequelize.query(
      'SELECT * FROM admin_users WHERE id = ? LIMIT 1',
      { replacements: [req.adminUser.id] }
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Only skip the current-password check when the account is flagged for forced reset.
    if (!user.must_change_password) {
      if (!currentPassword)
        return res.status(400).json({ error: 'Current password is required' });
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid)
        return res.status(401).json({ error: 'Current password is incorrect' });
      if (currentPassword === newPassword)
        return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await sequelize.query(
      'UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
      { replacements: [hash, req.adminUser.id] }
    );

    // Re-issue token with mustChangePassword cleared
    const [updatedRows] = await sequelize.query(
      'SELECT * FROM admin_users WHERE id = ? LIMIT 1',
      { replacements: [req.adminUser.id] }
    );
    const token = signAdminToken(updatedRows[0]);
    return res.json({ message: 'Password changed successfully', token });
  } catch (err) {
    console.error('[admin/auth/change-password]', err);
    return res.status(500).json({ error: 'Password change failed' });
  }
});

// POST /admin/auth/reset-my-password
// Local-dev placeholder: resets the currently logged-in admin's password to a
// well-known default. This will be replaced with an email-based reset flow
// once the app goes live.
router.post('/reset-my-password', adminJwt, async (req, res) => {
  try {
    const { sequelize } = require('../models');
    const hash = await bcrypt.hash('J@yden11', 12);
    await sequelize.query(
      'UPDATE admin_users SET password_hash = ? WHERE id = ?',
      { replacements: [hash, req.adminUser.id] }
    );
    return res.json({ message: 'Password has been reset.' });
  } catch (err) {
    console.error('[admin/auth/reset-my-password]', err);
    return res.status(500).json({ error: 'Password reset failed' });
  }
});

module.exports = router;
