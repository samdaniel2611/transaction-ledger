'use strict';

const transferService = require('../services/transfer.service');
const { validateTransfer } = require('../utils/validators');

async function createTransfer(req, res) {
  const payload = validateTransfer(req.body);
  const result = await transferService.transfer(payload);
  res.status(201).json({ data: result });
}

module.exports = { createTransfer };
