/**
 * Protect admin endpoints with a static API key header.
 * Usage: set X-Admin-Api-Key header to the value of ADMIN_API_KEY env var.
 */
const adminAuth = (req, res, next) => {
  const key = req.headers['x-admin-api-key'];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Forbidden: invalid admin API key' });
  }
  next();
};

module.exports = adminAuth;
