const jwt = require('jsonwebtoken');

/**
 * Require a valid JWT. Attaches decoded payload to req.user.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optionally attach decoded JWT to req.user (does not block unauthenticated requests).
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

module.exports = { authMiddleware, optionalAuth };
