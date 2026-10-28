'use strict';

const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const Account = require('../models/account.model');
const Transaction = require('../models/transaction.model');
const ApiError = require('../utils/ApiError');

/**
 * Transfer money from one account to another.
 *
 * The debit from the source and the credit to the destination (plus their two
 * ledger entries) are performed inside a single MongoDB transaction. If any
 * step fails — source missing, destination missing, insufficient balance, or a
 * duplicate reference — the whole operation is rolled back, so a partial
 * transfer is impossible.
 *
 * Both ledger entries share the same `reference_id` (allowed, because
 * reference_id is only unique *per account*), making the two legs easy to
 * correlate.
 */
async function transfer({ from_account_id, to_account_id, amount, reference_id, description }) {
  const ref = reference_id || `transfer-${randomUUID()}`;
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      const [source, destination] = await Promise.all([
        Account.findById(from_account_id).session(session),
        Account.findById(to_account_id).session(session),
      ]);

      if (!source) {
        throw ApiError.notFound(`Source account not found: ${from_account_id}`, 'ACCOUNT_NOT_FOUND');
      }
      if (!destination) {
        throw ApiError.notFound(
          `Destination account not found: ${to_account_id}`,
          'ACCOUNT_NOT_FOUND'
        );
      }

      // Atomically debit the source, rejecting if it would go negative.
      const debited = await Account.findOneAndUpdate(
        { _id: from_account_id, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session }
      );
      if (!debited) {
        throw ApiError.conflict(
          `Insufficient balance in source account for transfer of ${amount}`,
          'INSUFFICIENT_BALANCE',
          { balance: source.balance, requested: amount }
        );
      }

      // Credit the destination.
      const credited = await Account.findOneAndUpdate(
        { _id: to_account_id },
        { $inc: { balance: amount } },
        { new: true, session }
      );

      // Two immutable ledger entries, one per account.
      const [debitTxn, creditTxn] = await Transaction.create(
        [
          {
            _id: randomUUID(),
            account_id: from_account_id,
            type: 'debit',
            amount,
            description: description || `Transfer to ${to_account_id}`,
            reference_id: ref,
            balance_after: debited.balance,
          },
          {
            _id: randomUUID(),
            account_id: to_account_id,
            type: 'credit',
            amount,
            description: description || `Transfer from ${from_account_id}`,
            reference_id: ref,
            balance_after: credited.balance,
          },
        ],
        { session, ordered: true }
      );

      result = {
        reference_id: ref,
        amount,
        from: { account_id: debited._id, balance: debited.balance, transaction: debitTxn.toJSON() },
        to: { account_id: credited._id, balance: credited.balance, transaction: creditTxn.toJSON() },
      };
    });

    return result;
  } catch (err) {
    if (err && err.code === 11000) {
      throw ApiError.conflict(
        'A transfer with this reference_id already exists for one of the accounts',
        'DUPLICATE_REFERENCE',
        { reference_id: reference_id }
      );
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

module.exports = { transfer };
