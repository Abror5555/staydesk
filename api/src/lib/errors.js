/**
 * Errors that carry an HTTP status and a stable machine-readable code.
 * The frontend shows `message` to the user and can branch on `code`.
 */
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new HttpError(400, 'BAD_REQUEST', message, details);
const notFound = (what) => new HttpError(404, 'NOT_FOUND', `${what} not found`);
const conflict = (code, message, details) => new HttpError(409, code, message, details);
const unprocessable = (code, message, details) => new HttpError(422, code, message, details);

module.exports = { HttpError, badRequest, notFound, conflict, unprocessable };
