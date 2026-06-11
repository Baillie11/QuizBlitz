const jwt = require('jsonwebtoken');

/**
 * Accepts either:
 *  - Authorization: Bearer <admin_jwt>
 *  - X-Admin-Api-Key: <static key>  (backward compat for CLI/scripts)
 */
const adminJwt = (req, res, next) => {
  // Static API key fallback
  const apiKey = req.headers['x-admin-api-key'];
  if (apiKey && apiKey === process.env.ADMIN_API_KEY) {
    req.adminUser = { id: 0, email: 'api-key', username: 'API Key' };
    return next();
  }

  // Bearer JWT
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Admin authentication required' });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'admin') return res.status(403).json({ error: 'Invalid admin token' });
    req.adminUser = payload;
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired admin token' });
  }
};

module.exports = adminJwt;
