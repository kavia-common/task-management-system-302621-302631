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

app.set('trust proxy', cfg.trustProxy);

// Parse cookies (for optional httpOnly-cookie auth)
app.use(cookieParser());

// Parse JSON request body
app.use(express.json());

// CORS for the frontend SPA (supports bearer token and optional cookies)
//
// IMPORTANT:
// - Allowed origin is controlled by cfg.frontendUrl (NEXT_PUBLIC_FRONTEND_URL)
// - For cloud previews, this must match exactly, e.g.
//   https://vscode-internal-11829-beta.beta01.cloud.kavia.ai:3000
const CLOUD_PREVIEW_FRONTEND_ORIGIN =
  'https://vscode-internal-11829-beta.beta01.cloud.kavia.ai:3000';

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser requests (no Origin) and the configured frontend origin.
      if (!origin) return cb(null, true);

      // Hardcoded allow-list entry for this cloud preview workspace.
      if (origin === CLOUD_PREVIEW_FRONTEND_ORIGIN) return cb(null, true);

      // Env-configured origin (still supported).
      if (origin === cfg.frontendUrl) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // Ensure common SPA headers work (Authorization bearer tokens + JSON).
    allowedHeaders: ['Content-Type', 'Authorization', 'If-Match'],
    exposedHeaders: ['ETag'],
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

  // Avoid leaking internal details in production; keep message for dev.
  const message =
    status === 500 ? 'Internal Server Error' : (err.message || 'Request failed');

  if (status >= 500) {
    console.error(err.stack || err);
  }

  return res.status(status).json({
    status: 'error',
    message,
  });
});

module.exports = app;
