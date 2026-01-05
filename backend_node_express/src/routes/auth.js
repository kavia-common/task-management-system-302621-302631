const express = require('express');
const authController = require('../controllers/auth');
const { validateBody } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validation/schemas');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints (email/password)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register user
 *     description: Create a user in the app database and return a JWT for SPA usage.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: Registered successfully
 *       409:
 *         description: Email already registered
 */
router.post('/register', validateBody(registerSchema), authController.register.bind(authController));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     description: Verify credentials and return a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validateBody(loginSchema), authController.login.bind(authController));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout
 *     description: Clears auth cookie if enabled. For bearer token mode client can discard token.
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', authController.logout.bind(authController));

module.exports = router;
