'use strict';

const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const Account = require('../models/account.model');
const Transaction = require('../models/transaction.model');
const ApiError = require('../utils/ApiError');

/**
 * Apply a balance delta to an account atomically, guarding against going
 * negative on debits.
 *
 * For a debit we use a conditional update ({ balance: { $gte: amount } }) so the
 * balance check and the decrement are a single atomic operation — this prevents
 * two concurrent debits from both "seeing" sufficient balance and overdrawing
 * the account. Returns the updated account document, or null if the condition
 * failed (insufficient balance).
 */
async function applyBalanceDelta(accountId, type, amount, session) {
  if (type === 'credit') {
    return Account.findOneAndUpdate(
      { _id: accountId },
      { $inc: { balance: amount } },
      { new: true, session }
    );
  }
  // debit
  return Account.findOneAndUpdate(
    { _id: accountId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true, session }
  );
}

/**
 * Add a transaction to an account.
 *
 * Guarantees:
 *  - Duplicate `reference_id` per account is a no-op: no new transaction, no
 *    balance change; the existing transaction is returned with `duplicate:true`.
 *  - Debits with insufficient balance are rejected; balance is unchanged.
 *  - Creating the transaction and updating the balance are a single atomic
 *    operation via a MongoDB multi-document transaction (requires a replica set).
 *
 * @returns {{ transaction, account, duplicate: boolean }}
 */
async function addTransaction(accountId, { type, amount, reference_id, description }) {
  // Fast path: surface an obvious duplicate before opening a transaction.
  const existing = await Transaction.findOne({ account_id: accountId, reference_id });
  if (existing) {
    // Confirm the account still exists for a coherent response.
    const acct = await Account.findById(accountId).lean();
    return {
      transaction: existing.toJSON(),
      account: acct ? { id: acct._id, balance: acct.balance } : null,
      duplicate: true,
    };
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      // Ensure the account exists inside the transaction.
      const account = await Account.findById(accountId).session(session);
      if (!account) {
        throw ApiError.notFound(`Account not found: ${accountId}`, 'ACCOUNT_NOT_FOUND');
      }

      // Atomically move the balance (and reject insufficient-balance debits).
      const updated = await applyBalanceDelta(accountId, type, amount, session);
      if (!updated) {
        throw ApiError.conflict(
          `Insufficient balance for debit of ${amount}; current balance is ${account.balance}`,
          'INSUFFICIENT_BALANCE',
          { balance: account.balance, requested: amount }
        );
      }

      // Append the immutable ledger entry.
      const [txn] = await Transaction.create(
        [
          {
            _id: randomUUID(),
            account_id: accountId,
            type,
            amount,
            description,
            reference_id,
            balance_after: updated.balance,
          },
        ],
        { session }
      );

      result = { transaction: txn.toJSON(), account: { id: updated._id, balance: updated.balance } };
    });

    return { ...result, duplicate: false };
  } catch (err) {
    // A concurrent request may have inserted the same reference_id between our
    // fast-path check and the transaction commit — the unique index catches it.
    if (err && err.code === 11000) {
      const dup = await Transaction.findOne({ account_id: accountId, reference_id });
      const acct = await Account.findById(accountId).lean();
      return {
        transaction: dup ? dup.toJSON() : null,
        account: acct ? { id: acct._id, balance: acct.balance } : null,
        duplicate: true,
      };
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

/**
 * Fetch paginated, latest-first transaction history for an account, optionally
 * filtered by type.
 */
async function getHistory(accountId, { page, limit, type }) {
  const filter = { account_id: accountId };
  if (type) filter.type = type;

  const skip = (page - 1) * limit;

  const [items, totalRecords] = await Promise.all([
    Transaction.find(filter).sort({ created_at: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Transaction.countDocuments(filter),
  ]);

  const data = items.map((t) => ({
    id: t._id,
    account_id: t.account_id,
    type: t.type,
    amount: t.amount,
    description: t.description,
    reference_id: t.reference_id,
    balance_after: t.balance_after,
    created_at: t.created_at,
  }));

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  return {
    data,
    pagination: {
      page,
      limit,
      page_size: data.length,
      total_records: totalRecords,
      total_pages: totalPages,
    },
  };
}

module.exports = { addTransaction, getHistory };
