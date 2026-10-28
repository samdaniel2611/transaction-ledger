'use strict';

const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const TRANSACTION_TYPES = ['credit', 'debit'];

/**
 * Transaction (immutable append-only ledger entry)
 *
 * Once written, a transaction is never updated or deleted through the API.
 * The compound unique index on { account_id, reference_id } enforces, at the
 * database level, that a reference_id is unique *per account* (and may be
 * reused across different accounts).
 */
const transactionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID(),
    },
    account_id: {
      type: String,
      ref: 'Account',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: TRANSACTION_TYPES,
        message: 'type must be one of: credit, debit',
      },
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.00000001, 'amount must be greater than 0'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    reference_id: {
      type: String,
      required: [true, 'reference_id is required'],
      trim: true,
    },
    // Running balance of the account immediately after this transaction was
    // applied. Useful for audit/history display and never recomputed in place.
    balance_after: {
      type: Number,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  }
);

// Enforce reference_id uniqueness per account at the DB layer.
transactionSchema.index({ account_id: 1, reference_id: 1 }, { unique: true });

// Latest-first history queries.
transactionSchema.index({ account_id: 1, created_at: -1 });

transactionSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);
module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
