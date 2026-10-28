'use strict';

const express = require('express');
const cors = require('cors');

const config = require('./config/env');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

/**
 * Build and configure the Express application. Kept separate from server.js so
 * it can be imported by tests without binding to a port.
 */
function createApp() {
  const app = express();

  const corsOptions =
    config.corsOrigin === '*'
      ? { origin: true }
      : { origin: config.corsOrigin.split(',').map((o) => o.trim()) };

  app.use(cors(corsOptions));
  app.use(express.json());

  app.get('/', (req, res) =>
    res.json({ name: 'Transaction Ledger API', version: '1.0.0', docs: '/api/health' })
  );

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
