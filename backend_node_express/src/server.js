const app = require('./app');
const { getConfig } = require('./config/env');

/**
 * Entry point for the Express backend.
 * Starts the HTTP server and prints concise startup diagnostics (no secrets).
 */
const cfg = getConfig();

const PORT = cfg.port || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  const allowed = Array.isArray(app.locals.allowedCorsOrigins) ? app.locals.allowedCorsOrigins : [];
  const apiBase = cfg.backendUrl || `http://${HOST}:${PORT}`;

  console.log(`[startup] Server listening on ${HOST}:${PORT}`);
  console.log(`[startup] API base: ${apiBase}`);
  console.log(`[startup] CORS allowed origins: ${allowed.join(', ') || '(none configured)'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;
