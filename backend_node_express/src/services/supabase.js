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
      'Supabase is not configured. Missing SUPABASE_URL and/or a backend key (SUPABASE_SERVICE_ROLE_KEY preferred).'
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

  // This frequently indicates one of:
  // - schema not applied/migrations not run
  // - backend is using an anon key that lacks privileges to see tables
  // PostgREST will behave as if the table doesn't exist for that role.
  if (typeof message === 'string' && message.toLowerCase().includes('schema cache')) {
    mapped.status = 500;
    mapped.code = mapped.code || 'PGRST_SCHEMA_CACHE';
    mapped.message =
      'Database is not ready for auth: required tables are not visible to the configured Supabase key. ' +
      'Ensure Supabase schema has been applied and the backend uses a service role key (SUPABASE_SERVICE_ROLE_KEY).';
  }

  return mapped;
}

module.exports = {
  getSupabaseClient,
  mapSupabaseError,
};
