const cors = require('cors');
const cookieParser = require('cookie-parser');
const express = require('express');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');
const { getConfig } = require('./config/env');

// Initialize express app
const app = express();
const cfg = getConfig();

/**
 * Trust proxy must be enabled when running behind an HTTPS-terminating proxy (cloud preview),
 * otherwise req.secure/cookie secure behavior and origin/proto checks can be incorrect.
 *
 * Requirement: app.set('trust proxy', 1)
 */
app.set('trust proxy', cfg.trustProxy ? 1 : 0);

// Parse cookies (for optional httpOnly-cookie auth)
app.use(cookieParser());

// Parse JSON request body
app.use(express.json());

/**
 * CORS for the frontend SPA (supports bearer token and optional cookies).
 *
 * Requirements:
 * - Explicitly allow:
 *   - https://vscode-internal-11829-beta.beta01.cloud.kavia.ai:3000
 *   - http://localhost:3000 (and https://localhost:3000 for completeness)
 * - Allow Authorization, Content-Type
 * - credentials: true
 */
const CLOUD_PREVIEW_FRONTEND_ORIGIN =
  'https://vscode-internal-11829-beta.beta01.cloud.kavia.ai:3000';

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/$/, '');
}

const allowedOrigins = Array.from(
  new Set(
    [
      CLOUD_PREVIEW_FRONTEND_ORIGIN,
      'http://localhost:3000',
      'https://localhost:3000',
      cfg.frontendUrl, // env-configured origin (still supported)
    ]
      .filter(Boolean)
      .map(normalizeOrigin)
  )
);

// Expose for startup logs in server.js (do not put secrets here).
app.locals.allowedCorsOrigins = allowedOrigins;
app.locals.apiBase = cfg.backendUrl;

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser requests (no Origin) (curl, server-to-server, etc.)
      if (!origin) return cb(null, true);

      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalized)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // Ensure common SPA headers work (Authorization bearer tokens + JSON).
    allowedHeaders: ['Authorization', 'Content-Type', 'If-Match'],
    exposedHeaders: ['ETag'],
    optionsSuccessStatus: 204,
  })
);

app.get('/openapi.json', (req, res) => {
  // Serve the generated OpenAPI spec as JSON (used by cloud preview metadata and tooling).
  res.json(swaggerSpec);
});

app.use('/docs', swaggerUi.serve, (req, res, next) => {
  const host = req.get('host'); // may or may not include port
  let protocol = req.protocol; // http or https

  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');

  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) || (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: `${protocol}://${fullHost}`,
      },
    ],
  };
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

// Mount routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Not found',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // CORS errors are thrown as generic Error objects here.
  if (err && String(err.message || '').startsWith('CORS blocked')) {
    return res.status(403).json({
      status: 'error',
      message: err.message,
    });
  }

  const status = err.status && Number.isInteger(err.status) ? err.status : 500;

  /**
   * Avoid leaking internal details in production.
   *
   * However, some 500s are *actionable configuration errors* (e.g. missing Supabase service role key).
   * Those errors should be safe to expose to clients, so we support `err.expose = true`.
   */
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const shouldExpose500Message = !isProd || err?.expose === true;

  const message =
    status === 500
      ? (shouldExpose500Message ? (err.message || 'Internal Server Error') : 'Internal Server Error')
      : (err.message || 'Request failed');

  if (status >= 500) {
    console.error(err.stack || err);
  }

  return res.status(status).json({
    status: 'error',
    message,
  });
});

module.exports = app;
