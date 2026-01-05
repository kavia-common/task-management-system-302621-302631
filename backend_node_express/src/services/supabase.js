const { createClient } = require('@supabase/supabase-js');
const { getConfig } = require('../config/env');

let _client;

/**
 * PUBLIC_INTERFACE
 * Get a singleton Supabase client (backend/service key expected).
 */
function getSupabaseClient() {
  if (_client) return _client;

  const cfg = getConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseKey) {
    const err = new Error(
      'Supabase is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_KEY.'
    );
    err.status = 500;
    throw err;
  }

  _client = createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _client;
}

/**
 * Attempt to normalize Supabase/PostgREST errors into HTTP-friendly objects.
 */
function mapSupabaseError(err) {
  if (!err) return null;

  // PostgREST error object commonly includes: code, details, hint, message
  const message = err.message || 'Database error';
  const mapped = { status: 400, code: err.code, message };

  // Common unique violation in Postgres
  if (err.code === '23505') {
    mapped.status = 409;
    mapped.message = message;
  }

  // Some errors will come through as generic 'PGRST...' codes; keep 400 by default.
  return mapped;
}

module.exports = {
  getSupabaseClient,
  mapSupabaseError,
};
