const { asyncHandler, asyncHandlerArray } = require('../../infra/asyncHandler');
const express = require('express');
const router = express.Router();

const get = require('./get');
const create = require('./create');

router.post('/', asyncHandlerArray(create));
router.get('/', asyncHandlerArray(get));

module.exports = router;
