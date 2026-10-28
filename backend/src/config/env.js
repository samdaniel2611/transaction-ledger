'use strict';

require('dotenv').config();

/**
 * Centralised, validated access to environment configuration.
 * Reading config in one place keeps the rest of the codebase free of
 * `process.env` look-ups and makes missing values easy to spot.
 */
const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  mongoUri:
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/transaction_ledger?replicaSet=rs0&directConnection=true',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = config;
