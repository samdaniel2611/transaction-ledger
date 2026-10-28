'use strict';

const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

/**
 * Account
 *
 * - `id`         : stable public identifier (UUID). We expose this as `id`
 *                  rather than Mongo's `_id` so the API contract is independent
 *                  of the storage engine.
 * - `name`       : account holder name (required).
 * - `balance`    : current balance. Always starts at 0 and is only ever mutated
 *                  by the transaction/transfer services inside a DB transaction.
 * - `created_at` : system-generated creation timestamp.
 */
const accountSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID(),
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
      minlength: [1, 'name must not be empty'],
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'balance can never be negative'],
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    // We manage created_at explicitly; no updated_at to reinforce that the
    // account document is only touched for balance changes.
    timestamps: false,
  }
);

accountSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Account', accountSchema);
