'use strict';

/**
 * ApiError — a typed, HTTP-aware error.
 *
 * Services throw these so the central error handler can translate them into a
 * consistent JSON envelope with the right status code. `code` is a short,
 * stable, machine-readable string the frontend can branch on.
 */
class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details) {
    return new ApiError(400, code, message, details);
  }

  static notFound(message, code = 'NOT_FOUND') {
    return new ApiError(404, code, message);
  }

  static conflict(message, code = 'CONFLICT', details) {
    return new ApiError(409, code, message, details);
  }

  static unprocessable(message, code = 'VALIDATION_ERROR', details) {
    return new ApiError(422, code, message, details);
  }
}

module.exports = ApiError;
