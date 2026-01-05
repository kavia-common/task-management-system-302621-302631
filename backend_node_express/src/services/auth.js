const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

function getJwtSecretOrThrow() {
  const cfg = getConfig();

  // Prefer explicit JWT_SECRET (recommended).
  if (cfg.jwtSecret && String(cfg.jwtSecret).trim()) return cfg.jwtSecret;

  // Cloud preview resilience: derive a stable secret from Supabase key if present.
  // This avoids hard failure when orchestrator does not provide JWT_SECRET.
  // NOTE: Still secure as long as SUPABASE_KEY is kept server-side.
  if (cfg.supabaseKey && String(cfg.supabaseKey).trim()) {
    return crypto
      .createHash('sha256')
      .update(`tm_jwt_v1:${cfg.supabaseUrl || ''}:${cfg.supabaseKey}`)
      .digest('hex');
  }

  const err = new Error('JWT_SECRET is not configured (and no Supabase key to derive fallback).');
  err.status = 500;
  throw err;
}

/**
 * PUBLIC_INTERFACE
 * Sign a JWT for a given user id.
 */
function signAccessToken(payload) {
  const cfg = getConfig();
  const secret = getJwtSecretOrThrow();

  return jwt.sign(payload, secret, {
    expiresIn: cfg.jwtExpiresIn,
  });
}

/**
 * PUBLIC_INTERFACE
 * Verify a JWT and return decoded payload.
 */
function verifyAccessToken(token) {
  const secret = getJwtSecretOrThrow();
  return jwt.verify(token, secret);
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
};
