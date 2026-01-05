const express = require('express');
const healthController = require('../controllers/health');
const authRoutes = require('./auth');
const taskRoutes = require('./tasks');

const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health endpoint
 *     responses:
 *       200:
 *         description: Service health check passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/', healthController.check.bind(healthController));

/**
 * @swagger
 * /api/health/supabase:
 *   get:
 *     summary: Supabase readiness check
 *     description: |
 *       Performs a lightweight query against Supabase to verify the backend is correctly configured.
 *       Useful for diagnosing authentication failures due to missing schema or missing service role key.
 *     responses:
 *       200:
 *         description: Supabase ready
 *       503:
 *         description: Supabase not ready/misconfigured (actionable error in response)
 */
router.get('/api/health/supabase', healthController.checkSupabase.bind(healthController));

router.use('/api/auth', authRoutes);
router.use('/api/tasks', taskRoutes);

module.exports = router;
