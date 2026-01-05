const { getConfig } = require('../config/env');

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
}

module.exports = new HealthService();
