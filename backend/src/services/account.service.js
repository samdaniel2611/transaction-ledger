'use strict';

const Account = require('../models/account.model');
const ApiError = require('../utils/ApiError');

/**
 * Create a new account.
 *
 * Balance is ALWAYS forced to 0 and `created_at` is system-generated — any
 * client-supplied `balance`, `id` or `created_at` is ignored by design.
 */
async function createAccount({ name }) {
  const account = await Account.create({ name, balance: 0 });
  return account.toJSON();
}

async function listAccounts() {
  const accounts = await Account.find().sort({ created_at: -1 }).lean();
  return accounts.map((a) => ({
    id: a._id,
    name: a.name,
    balance: a.balance,
    created_at: a.created_at,
  }));
}

/**
 * Fetch a single account document (Mongoose doc). Throws 404 if missing.
 * Accepts an optional session so it can participate in a transaction.
 */
async function getAccountOrThrow(accountId, session = null) {
  const query = Account.findById(accountId);
  if (session) query.session(session);
  const account = await query;
  if (!account) {
    throw ApiError.notFound(`Account not found: ${accountId}`, 'ACCOUNT_NOT_FOUND');
  }
  return account;
}

async function getAccount(accountId) {
  const account = await getAccountOrThrow(accountId);
  return account.toJSON();
}

async function getBalance(accountId) {
  const account = await getAccountOrThrow(accountId);
  return { account_id: account._id, balance: account.balance };
}

module.exports = {
  createAccount,
  listAccounts,
  getAccount,
  getAccountOrThrow,
  getBalance,
};
