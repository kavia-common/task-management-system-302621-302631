const { z } = require('zod');

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(200);

const uuidSchema = z.string().uuid();

const taskStatusSchema = z.enum(['todo', 'in_progress', 'done']);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: z.number().int().min(0).max(10).optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: z.number().int().min(0).max(10).optional().nullable(),
  // For optimistic concurrency (optional, can also come via If-Match header)
  version: z.number().int().min(1).optional(),
});

module.exports = {
  uuidSchema,
  registerSchema,
  loginSchema,
  createTaskSchema,
  updateTaskSchema,
  taskStatusSchema,
};
