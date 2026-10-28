'use strict';

const createApp = require('./app');
const config = require('./config/env');
const { connectDatabase } = require('./config/database');

async function start() {
  try {
    await connectDatabase();
    const app = createApp();
    app.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] Transaction Ledger API listening on http://localhost:${config.port}`);
      // eslint-disable-next-line no-console
      console.log(`[server] environment: ${config.nodeEnv}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  }
}

start();
