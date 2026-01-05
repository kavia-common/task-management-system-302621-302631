const { getSupabaseClient, mapSupabaseError } = require('../services/supabase');
const { hashPassword, verifyPassword, signAccessToken } = require('../services/auth');
const { getConfig } = require('../config/env');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function setAuthCookie(res, token) {
  const cfg = getConfig();
  if (!cfg.useAuthCookie) return;

  // For local dev over http, secure must be false.
  // When behind a proxy with HTTPS termination, `trust proxy` ensures req.secure works,
  // but cookie options here are env-based to remain predictable.
  const secure = cfg.nodeEnv === 'production';

  res.cookie(cfg.cookieName, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  const cfg = getConfig();
  res.clearCookie(cfg.cookieName, { path: '/' });
}

class AuthController {
  /**
   * PUBLIC_INTERFACE
   * Register a new user.
   * Creates a row in public.users with email + password_hash.
   * Returns a backend-issued JWT token for SPA use.
   */
  async register(req, res, next) {
    try {
      const supabase = getSupabaseClient();
      const { email, password } = req.validatedBody;

      const normalizedEmail = normalizeEmail(email);
      const passwordHash = await hashPassword(password);

      // Step 1: insert user row.
      // If insertion succeeds but later steps fail (token generation), rollback by deleting inserted row.
      const { data: insertedUsers, error: insertError } = await supabase
        .from('users')
        .insert({ email: normalizedEmail, password_hash: passwordHash })
        .select('id,email,created_at')
        .limit(1);

      if (insertError) {
        const mapped = mapSupabaseError(insertError);
        const status = mapped?.status || 400;

        // Surface "email already exists" nicely
        if (status === 409) {
          return res.status(409).json({
            status: 'error',
            message: 'Email is already registered',
          });
        }

        const msg = mapped?.message || 'Registration failed';
        return res.status(status).json({
          status: 'error',
          message: msg,
        });
      }

      const user = insertedUsers && insertedUsers[0];
      if (!user) {
        // Should not happen, but handle edge cases safely.
        return res.status(500).json({
          status: 'error',
          message: 'Registration failed: no user returned',
        });
      }

      try {
        const token = signAccessToken({ sub: user.id, email: user.email });

        setAuthCookie(res, token);

        return res.status(201).json({
          status: 'ok',
          user: { id: user.id, email: user.email, created_at: user.created_at },
          token,
        });
      } catch (err) {
        // Partial registration rollback: delete created user if token generation fails.
        await supabase.from('users').delete().eq('id', user.id);
        throw err;
      }
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Login.
   * Verifies email/password against public.users.password_hash and returns JWT.
   */
  async login(req, res, next) {
    try {
      const supabase = getSupabaseClient();
      const { email, password } = req.validatedBody;

      const normalizedEmail = normalizeEmail(email);

      const { data: users, error } = await supabase
        .from('users')
        .select('id,email,password_hash,created_at')
        .eq('email', normalizedEmail)
        .limit(1);

      if (error) {
        const mapped = mapSupabaseError(error);
        return res.status(mapped?.status || 400).json({
          status: 'error',
          message: mapped?.message || 'Login failed',
        });
      }

      const user = users && users[0];
      if (!user) {
        // Do not reveal which part failed.
        return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
      }

      const ok = await verifyPassword(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
      }

      const token = signAccessToken({ sub: user.id, email: user.email });

      setAuthCookie(res, token);

      return res.status(200).json({
        status: 'ok',
        user: { id: user.id, email: user.email, created_at: user.created_at },
        token,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Logout.
   * For bearer token flow, client just discards token; for cookie flow, we clear cookie.
   */
  async logout(req, res, next) {
    try {
      clearAuthCookie(res);
      return res.status(200).json({ status: 'ok' });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new AuthController();
