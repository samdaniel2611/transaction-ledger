'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const accountController = require('../controllers/account.controller');
const transactionController = require('../controllers/transaction.controller');
const transferController = require('../controllers/transfer.controller');

const router = express.Router();

// Health check
router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Accounts
router.post('/accounts', asyncHandler(accountController.createAccount));
router.get('/accounts', asyncHandler(accountController.listAccounts));
router.get('/accounts/:accountId', asyncHandler(accountController.getAccount));
router.get('/accounts/:accountId/balance', asyncHandler(accountController.getBalance));

// Transactions (nested under an account)
router.post('/accounts/:accountId/transactions', asyncHandler(transactionController.addTransaction));
router.get('/accounts/:accountId/transactions', asyncHandler(transactionController.getHistory));

// Money transfer (bonus)
router.post('/transfers', asyncHandler(transferController.createTransfer));

module.exports = router;
