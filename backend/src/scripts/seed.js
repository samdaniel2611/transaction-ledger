'use strict';

/**
 * Optional seed script: creates two demo accounts and a few transactions so the
 * frontend has something to show on first run. Safe to run multiple times — it
 * clears existing data first.
 *
 *   npm run seed
 */
const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const Account = require('../models/account.model');
const Transaction = require('../models/transaction.model');
const accountService = require('../services/account.service');
const transactionService = require('../services/transaction.service');

async function run() {
  await connectDatabase();

  await Transaction.deleteMany({});
  await Account.deleteMany({});

  const alice = await accountService.createAccount({ name: 'Alice' });
  const bob = await accountService.createAccount({ name: 'Bob' });

  await transactionService.addTransaction(alice.id, {
    type: 'credit',
    amount: 100,
    reference_id: 'seed-credit-1',
    description: 'Opening deposit',
  });
  await transactionService.addTransaction(alice.id, {
    type: 'credit',
    amount: 50,
    reference_id: 'seed-credit-2',
    description: 'Salary',
  });
  await transactionService.addTransaction(alice.id, {
    type: 'debit',
    amount: 30,
    reference_id: 'seed-debit-1',
    description: 'Groceries',
  });
  await transactionService.addTransaction(bob.id, {
    type: 'credit',
    amount: 200,
    reference_id: 'seed-credit-1',
    description: 'Opening deposit',
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete:');
  // eslint-disable-next-line no-console
  console.log('  Alice:', alice.id, '(expected balance 120)');
  // eslint-disable-next-line no-console
  console.log('  Bob:  ', bob.id, '(expected balance 200)');

  await disconnectDatabase();
  await mongoose.disconnect();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
