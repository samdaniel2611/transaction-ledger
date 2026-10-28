'use strict';

const ApiError = require('./ApiError');
const { TRANSACTION_TYPES } = require('../models/transaction.model');

/**
 * Small, dependency-free request validators. Each throws an ApiError with a
 * 422 VALIDATION_ERROR status and a `details` array describing the offending
 * fields, which the error handler serialises consistently.
 */

function fail(details) {
  throw ApiError.unprocessable('Request validation failed', 'VALIDATION_ERROR', details);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateCreateAccount(body) {
  const details = [];
  if (!body || typeof body !== 'object') {
    fail([{ field: 'body', message: 'Request body must be a JSON object' }]);
  }
  if (!isNonEmptyString(body.name)) {
    details.push({ field: 'name', message: 'name is required and must be a non-empty string' });
  }
  if (details.length) fail(details);

  return { name: body.name.trim() };
}

function validateCreateTransaction(body) {
  const details = [];
  if (!body || typeof body !== 'object') {
    fail([{ field: 'body', message: 'Request body must be a JSON object' }]);
  }

  if (!isNonEmptyString(body.type) || !TRANSACTION_TYPES.includes(body.type)) {
    details.push({
      field: 'type',
      message: `type is required and must be one of: ${TRANSACTION_TYPES.join(', ')}`,
    });
  }

  const amount = body.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    details.push({ field: 'amount', message: 'amount is required and must be a number greater than 0' });
  }

  if (!isNonEmptyString(body.reference_id)) {
    details.push({
      field: 'reference_id',
      message: 'reference_id is required and must be a non-empty string',
    });
  }

  if (body.description !== undefined && typeof body.description !== 'string') {
    details.push({ field: 'description', message: 'description must be a string' });
  }

  if (details.length) fail(details);

  return {
    type: body.type,
    amount: body.amount,
    reference_id: body.reference_id.trim(),
    description: typeof body.description === 'string' ? body.description.trim() : '',
  };
}

function validateTransfer(body) {
  const details = [];
  if (!body || typeof body !== 'object') {
    fail([{ field: 'body', message: 'Request body must be a JSON object' }]);
  }

  if (!isNonEmptyString(body.from_account_id)) {
    details.push({ field: 'from_account_id', message: 'from_account_id is required' });
  }
  if (!isNonEmptyString(body.to_account_id)) {
    details.push({ field: 'to_account_id', message: 'to_account_id is required' });
  }
  if (
    isNonEmptyString(body.from_account_id) &&
    isNonEmptyString(body.to_account_id) &&
    body.from_account_id === body.to_account_id
  ) {
    details.push({
      field: 'to_account_id',
      message: 'from_account_id and to_account_id must be different',
    });
  }

  const amount = body.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    details.push({ field: 'amount', message: 'amount is required and must be a number greater than 0' });
  }

  if (body.reference_id !== undefined && !isNonEmptyString(body.reference_id)) {
    details.push({ field: 'reference_id', message: 'reference_id, if provided, must be a non-empty string' });
  }

  if (body.description !== undefined && typeof body.description !== 'string') {
    details.push({ field: 'description', message: 'description must be a string' });
  }

  if (details.length) fail(details);

  return {
    from_account_id: body.from_account_id.trim(),
    to_account_id: body.to_account_id.trim(),
    amount: body.amount,
    reference_id: isNonEmptyString(body.reference_id) ? body.reference_id.trim() : undefined,
    description: typeof body.description === 'string' ? body.description.trim() : '',
  };
}

/**
 * Parse & validate pagination and optional `type` filter from query params.
 */
function parseHistoryQuery(query) {
  const details = [];

  let page = 1;
  let limit = 20;

  if (query.page !== undefined) {
    page = Number(query.page);
    if (!Number.isInteger(page) || page < 1) {
      details.push({ field: 'page', message: 'page must be a positive integer' });
    }
  }

  if (query.limit !== undefined) {
    limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      details.push({ field: 'limit', message: 'limit must be an integer between 1 and 100' });
    }
  }

  let type;
  if (query.type !== undefined && query.type !== '') {
    if (!TRANSACTION_TYPES.includes(query.type)) {
      details.push({
        field: 'type',
        message: `type must be one of: ${TRANSACTION_TYPES.join(', ')}`,
      });
    } else {
      type = query.type;
    }
  }

  if (details.length) fail(details);

  return { page, limit, type };
}

module.exports = {
  validateCreateAccount,
  validateCreateTransaction,
  validateTransfer,
  parseHistoryQuery,
};
