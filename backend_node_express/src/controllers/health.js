const healthService = require('../services/health');

class HealthController {
  check(req, res) {
    const healthStatus = healthService.getStatus();
    return res.status(200).json(healthStatus);
  }

  /**
   * PUBLIC_INTERFACE
   * Supabase readiness diagnostics endpoint.
   *
   * - 200 when Supabase is reachable and required tables are visible
   * - 503 when Supabase is not ready/misconfigured (actionable error returned)
   */
  async checkSupabase(req, res, next) {
    try {
      const status = await healthService.getSupabaseStatus();
      return res.status(status.ok ? 200 : 503).json(status);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new HealthController();
