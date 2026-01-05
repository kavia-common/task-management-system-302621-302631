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
 * PUBLIC_INTERFACE
 * Return the parsed environment configuration for the backend.
 */
function getConfig() {
  /** IMPORTANT:
   * These env vars must be provided by the environment (or .env in local dev):
   * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
   * - NEXT_PUBLIC_SUPABASE_KEY: Service role key OR a key with DB write access for this backend
   * - NEXT_PUBLIC_FRONTEND_URL: e.g. http://localhost:3000 (for CORS)
   *   - CORS is configured to allow this origin and supports credentials for optional cookies.
   *   - Authorization Bearer header is allowed.
   * - JWT_SECRET: secret used to sign backend-issued JWTs (MUST be set in .env by orchestrator)
   */
  const nodeEnv = getEnv('NEXT_PUBLIC_NODE_ENV', process.env.NODE_ENV || 'development');

  const config = {
    nodeEnv,
    port: Number(getEnv('PORT', getEnv('NEXT_PUBLIC_PORT', '3001'))),
    trustProxy: getBool('NEXT_PUBLIC_TRUST_PROXY', true),

    frontendUrl: getEnv('NEXT_PUBLIC_FRONTEND_URL', 'http://localhost:3000'),
    backendUrl: getEnv('NEXT_PUBLIC_BACKEND_URL', 'http://localhost:3001'),

    // Support both naming conventions: the task states SUPABASE_URL/SUPABASE_KEY,
    // while local/dev containers may use NEXT_PUBLIC_SUPABASE_*.
    supabaseUrl: getEnv('SUPABASE_URL', getEnv('NEXT_PUBLIC_SUPABASE_URL')),
    supabaseKey: getEnv('SUPABASE_KEY', getEnv('NEXT_PUBLIC_SUPABASE_KEY')),

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
