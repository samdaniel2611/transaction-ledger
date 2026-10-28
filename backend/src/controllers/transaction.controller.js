'use strict';

const transactionService = require('../services/transaction.service');
const accountService = require('../services/account.service');
const { validateCreateTransaction, parseHistoryQuery } = require('../utils/validators');

async function addTransaction(req, res) {
  const payload = validateCreateTransaction(req.body);
  const result = await transactionService.addTransaction(req.params.accountId, payload);

  if (result.duplicate) {
    // Idempotent duplicate: nothing was created, balance unchanged.
    return res.status(200).json({
      data: result.transaction,
      account: result.account,
      duplicate: true,
      message: 'A transaction with this reference_id already exists for this account',
    });
  }

  return res.status(201).json({
    data: result.transaction,
    account: result.account,
    duplicate: false,
  });
}

async function getHistory(req, res) {
  // Ensure the account exists first so a missing account is a clean 404.
  await accountService.getBalance(req.params.accountId);

  const query = parseHistoryQuery(req.query);
  const result = await transactionService.getHistory(req.params.accountId, query);
  res.json(result);
}

module.exports = { addTransaction, getHistory };
