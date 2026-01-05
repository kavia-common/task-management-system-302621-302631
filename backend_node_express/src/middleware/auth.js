const { verifyAccessToken } = require('../services/auth');
const { getConfig } = require('../config/env');

/**
 * Try extracting token from Authorization header or cookie.
 */
function extractToken(req) {
  const authHeader = req.get('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice('bearer '.length).trim();
  }

  const cfg = getConfig();
  if (req.cookies && req.cookies[cfg.cookieName]) {
    return req.cookies[cfg.cookieName];
  }

  return null;
}

/**
 * PUBLIC_INTERFACE
 * Require authentication and set req.auth = { userId }.
 */
function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Missing authorization token',
      });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
    }

    req.auth = { userId: decoded.sub };
    return next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
    });
  }
}

module.exports = {
  requireAuth,
};
