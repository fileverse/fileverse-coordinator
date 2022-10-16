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

router.post('/create', asyncHandler(canCreate), asyncHandlerArray(create));
router.post('/get', asyncHandler(canView), asyncHandlerArray(get));

module.exports = router;
