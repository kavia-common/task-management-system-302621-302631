const dotenv = require('dotenv');

dotenv.config();

/**
 * Small helper to read env vars in a consistent way.
 * We purposely support the provided container env var names (NEXT_PUBLIC_*)
 * because that is what exists in this project’s environment.
 */
function getEnv(name, defaultValue = undefined) {
  const val = process.env[name];
  if (val === undefined || val === null || String(val).trim() === '') {
    return defaultValue;
  }
  return val;
}

/**
 * Parse a boolean-ish env var.
 */
function getBool(name, defaultValue = false) {
  const raw = getEnv(name);
  if (raw === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

/**
 * Best-effort decode of a JWT payload without verifying the signature.
 * Supabase anon/service keys are JWTs whose payload commonly includes `role`.
 */
function decodeJwtPayloadNoVerify(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const payloadB64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');

    const json = Buffer.from(payloadB64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * PUBLIC_INTERFACE
 * Return the parsed environment configuration for the backend.
 */
function getConfig() {
  /** IMPORTANT:
   * Backend requires a Supabase key that can read/write app tables.
   *
   * Recommended env vars (backend):
   * - SUPABASE_URL
   * - SUPABASE_SERVICE_ROLE_KEY (preferred)
   *   - If not provided, SUPABASE_KEY / NEXT_PUBLIC_SUPABASE_KEY is used as fallback.
   *
   * NOTE: Using an anon key on the backend can cause PostgREST errors like:
   * "Could not find the table 'public.users' in the schema cache"
   * because the anon role may not have privileges to see/modify tables.
   */
  const nodeEnv = getEnv('NEXT_PUBLIC_NODE_ENV', process.env.NODE_ENV || 'development');

  const supabaseUrl = getEnv('SUPABASE_URL', getEnv('NEXT_PUBLIC_SUPABASE_URL'));

  // Prefer service role key env var names for backend safety.
  const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY');

  const supabaseKey =
    supabaseServiceRoleKey ||
    getEnv('SUPABASE_KEY') ||
    getEnv('NEXT_PUBLIC_SUPABASE_KEY');

  const supabaseKeyRole = (() => {
    const payload = decodeJwtPayloadNoVerify(supabaseKey);
    return payload && typeof payload.role === 'string' ? payload.role : null;
  })();

  const config = {
    nodeEnv,
    port: Number(getEnv('PORT', getEnv('NEXT_PUBLIC_PORT', '3001'))),
    trustProxy: getBool('NEXT_PUBLIC_TRUST_PROXY', true),

    frontendUrl: getEnv('NEXT_PUBLIC_FRONTEND_URL', 'http://localhost:3000'),
    backendUrl: getEnv('NEXT_PUBLIC_BACKEND_URL', 'http://localhost:3001'),

    supabaseUrl,
    supabaseKey,
    // Useful for diagnostics and clearer error messages.
    supabaseKeyRole,
    // True only when configured via SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY env vars.
    supabaseServiceRoleConfigured: Boolean(supabaseServiceRoleKey),

    jwtSecret: getEnv('JWT_SECRET'),
    jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),

    // If true, backend will set an httpOnly cookie in addition to returning token in JSON.
    // SPA bearer-token flow still works either way.
    useAuthCookie: getBool('AUTH_USE_COOKIE', false),
    cookieName: getEnv('AUTH_COOKIE_NAME', 'tm_session'),
  };

  return config;
}

module.exports = {
  getConfig,
};
