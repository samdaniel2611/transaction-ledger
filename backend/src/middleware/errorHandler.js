'use strict';

const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');

/**
 * 404 handler for unknown routes.
 */
function notFoundHandler(req, res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Central error handler — produces a single, consistent error envelope:
 *   { error: { code, message, details? } }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let apiError = err;

  // Normalise known non-ApiError errors into ApiError instances.
  if (!(err instanceof ApiError)) {
    if (err instanceof mongoose.Error.ValidationError) {
      const details = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      apiError = new ApiError(422, 'VALIDATION_ERROR', 'Request validation failed', details);
    } else if (err instanceof mongoose.Error.CastError) {
      apiError = new ApiError(400, 'INVALID_IDENTIFIER', `Invalid value for '${err.path}'`);
    } else if (err && err.code === 11000) {
      // Duplicate key from a unique index (e.g. {account_id, reference_id}).
      apiError = new ApiError(
        409,
        'DUPLICATE_KEY',
        'A record with the same unique key already exists',
        err.keyValue
      );
    } else {
      apiError = new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
  }

  if (apiError.statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  const body = {
    error: {
      code: apiError.code,
      message: apiError.message,
    },
  };
  if (apiError.details !== undefined) {
    body.error.details = apiError.details;
  }
  if (config.nodeEnv === 'development' && apiError.statusCode >= 500) {
    body.error.stack = err.stack;
  }

  res.status(apiError.statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
