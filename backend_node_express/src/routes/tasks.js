const express = require('express');
const tasksController = require('../controllers/tasks');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema } = require('../validation/schemas');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Tasks
 *     description: Task CRUD endpoints
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     summary: List tasks
 *     responses:
 *       200:
 *         description: List of tasks
 *       401:
 *         description: Unauthorized
 */
router.get('/', requireAuth, tasksController.list.bind(tasksController));

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string, nullable: true }
 *               status: { type: string, enum: [todo, in_progress, done] }
 *               priority: { type: integer, nullable: true }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', requireAuth, validateBody(createTaskSchema), tasksController.create.bind(tasksController));

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     summary: Get task
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Task
 *       404:
 *         description: Not found
 */
router.get('/:id', requireAuth, tasksController.get.bind(tasksController));

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update task
 *     description: |
 *       Supports optimistic concurrency. Provide If-Match header with current version (recommended).
 *       If omitted, backend will fetch current version and proceed; DB trigger may still reject on conflict.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: If-Match
 *         in: header
 *         required: false
 *         schema: { type: string }
 *         description: Task version to enforce optimistic concurrency (e.g. "3")
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string, nullable: true }
 *               status: { type: string, enum: [todo, in_progress, done] }
 *               priority: { type: integer, nullable: true }
 *               version: { type: integer, description: "Optional expected current version (alternative to If-Match)" }
 *     responses:
 *       200:
 *         description: Updated
 *       409:
 *         description: Version conflict
 */
router.patch('/:id', requireAuth, validateBody(updateTaskSchema), tasksController.update.bind(tasksController));

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     summary: Delete task
 *     description: Requires optimistic concurrency precondition (If-Match).
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: If-Match
 *         in: header
 *         required: true
 *         schema: { type: string }
 *         description: Expected task version (e.g. "3")
 *       - name: version
 *         in: query
 *         required: false
 *         schema: { type: integer }
 *         description: Alternative to If-Match (not recommended)
 *     responses:
 *       200:
 *         description: Deleted
 *       409:
 *         description: Version conflict
 *       428:
 *         description: Precondition required
 */
router.delete('/:id', requireAuth, tasksController.remove.bind(tasksController));

module.exports = router;
