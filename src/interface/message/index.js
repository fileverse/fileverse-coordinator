const {
  asyncHandler,
  asyncHandlerArray,
} = require('../../infra/asyncHandler');
const express = require('express');
const router = express.Router();

const canCreate = require('../middleware/canCreate');
const canView = require('../middleware/canView');

const create = require('./create');
const get = require('./get');
const process = require('./process');

router.post('/create', asyncHandler(canCreate), asyncHandlerArray(create));
router.post('/get', asyncHandler(canView), asyncHandlerArray(get));
router.post('/:messageId', asyncHandler(canCreate), asyncHandlerArray(process));

module.exports = router;
