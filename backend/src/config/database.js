'use strict';

const mongoose = require('mongoose');
const config = require('./env');

/**
 * Establish the MongoDB connection.
 *
 * NOTE: multi-document transactions (used for atomic transaction/balance
 * updates and money transfers) require MongoDB to run as a replica set.
 * See docker-compose.yml / README for how to start a single-node replica set.
 */
async function connectDatabase() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    // eslint-disable-next-line no-console
    console.log('[db] connected to MongoDB');
  });
  mongoose.connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[db] connection error:', err.message);
  });

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
