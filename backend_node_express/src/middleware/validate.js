const { ZodError } = require('zod');

/**
 * PUBLIC_INTERFACE
 * Validate req.body against a Zod schema and populate req.validatedBody.
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body ?? {});
      req.validatedBody = parsed;
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          issues: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        });
      }
      return next(err);
    }
  };
}

module.exports = {
  validateBody,
};
