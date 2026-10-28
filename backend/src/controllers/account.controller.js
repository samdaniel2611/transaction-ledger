'use strict';

const accountService = require('../services/account.service');
const { validateCreateAccount } = require('../utils/validators');

async function createAccount(req, res) {
  const payload = validateCreateAccount(req.body);
  const account = await accountService.createAccount(payload);
  res.status(201).json({ data: account });
}

async function listAccounts(req, res) {
  const accounts = await accountService.listAccounts();
  res.json({ data: accounts });
}

async function getAccount(req, res) {
  const account = await accountService.getAccount(req.params.accountId);
  res.json({ data: account });
}

async function getBalance(req, res) {
  const balance = await accountService.getBalance(req.params.accountId);
  res.json({ data: balance });
}

module.exports = { createAccount, listAccounts, getAccount, getBalance };
