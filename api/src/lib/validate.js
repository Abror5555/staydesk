const { HttpError } = require('./errors');

/**
 * Express middleware factory: validates req[source] with a zod schema and
 * replaces it with the parsed (typed, defaulted) value.
 * Validation errors become a 400 response with a field -> message map.
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || source;
        if (!fields[key]) fields[key] = issue.message;
      }
      return next(new HttpError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields', fields));
    }
    req[source] = result.data;
    return next();
  };
}

/** Wrap async route handlers so rejected promises reach the error handler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { validate, asyncHandler };
