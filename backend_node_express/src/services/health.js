const { getConfig } = require('../config/env');
const { getSupabaseClient, mapSupabaseError } = require('./supabase');

class HealthService {
  getStatus() {
    const cfg = getConfig();
    return {
      status: 'ok',
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
      environment: cfg.nodeEnv || 'development',
    };
  }

  /**
   * PUBLIC_INTERFACE
   * Check Supabase connectivity + schema visibility (lightweight query).
   *
   * Returns:
   * - { ok: true, ... } when the backend can read the required tables
   * - { ok: false, error: { status, code, message }, ... } on configuration/schema issues
   *
   * NOTE: This endpoint does not return secrets. It only returns non-sensitive diagnostics
   * like the key role ("anon"/"service_role") and whether a service role env var is configured.
   */
  async getSupabaseStatus() {
    const cfg = getConfig();

    // Fast fail: env not present or anon key used (service role missing).
    try {
      const supabase = getSupabaseClient();

      // Minimal probe: verify we can read the `users` table schema.
      // Using limit(1) keeps payload small and does not require any existing rows.
      const { error } = await supabase.from('users').select('id').limit(1);

      if (error) {
        const mapped = mapSupabaseError(error) || { status: 500, message: 'Supabase error' };
        return {
          ok: false,
          timestamp: new Date().toISOString(),
          supabase: {
            urlConfigured: Boolean(cfg.supabaseUrl),
            keyRole: cfg.supabaseKeyRole || null,
            serviceRoleConfigured: Boolean(cfg.supabaseServiceRoleConfigured),
          },
          error: mapped,
        };
      }

      return {
        ok: true,
        timestamp: new Date().toISOString(),
        supabase: {
          urlConfigured: Boolean(cfg.supabaseUrl),
          keyRole: cfg.supabaseKeyRole || null,
          serviceRoleConfigured: Boolean(cfg.supabaseServiceRoleConfigured),
        },
      };
    } catch (err) {
      const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
      return {
        ok: false,
        timestamp: new Date().toISOString(),
        supabase: {
          urlConfigured: Boolean(cfg.supabaseUrl),
          keyRole: cfg.supabaseKeyRole || null,
          serviceRoleConfigured: Boolean(cfg.supabaseServiceRoleConfigured),
        },
        error: {
          status,
          code: err?.code,
          message: err?.message || 'Supabase is not configured',
        },
      };
    }
  }
}

module.exports = new HealthService();
