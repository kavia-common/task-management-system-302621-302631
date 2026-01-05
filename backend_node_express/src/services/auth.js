const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConfig } = require('../config/env');

/**
 * PUBLIC_INTERFACE
 * Hash a plaintext password using bcrypt.
 */
async function hashPassword(password) {
  // bcryptjs is pure JS; 10 is a reasonable default cost factor for many apps.
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * PUBLIC_INTERFACE
 * Compare plaintext password with stored bcrypt hash.
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * PUBLIC_INTERFACE
 * Sign a JWT for a given user id.
 */
function signAccessToken(payload) {
  const cfg = getConfig();
  if (!cfg.jwtSecret) {
    const err = new Error('JWT_SECRET is not configured.');
    err.status = 500;
    throw err;
  }

  return jwt.sign(payload, cfg.jwtSecret, {
    expiresIn: cfg.jwtExpiresIn,
  });
}

/**
 * PUBLIC_INTERFACE
 * Verify a JWT and return decoded payload.
 */
function verifyAccessToken(token) {
  const cfg = getConfig();
  if (!cfg.jwtSecret) {
    const err = new Error('JWT_SECRET is not configured.');
    err.status = 500;
    throw err;
  }

  return jwt.verify(token, cfg.jwtSecret);
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
};
