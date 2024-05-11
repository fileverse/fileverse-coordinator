const { asyncHandler } = require('../../infra/asyncHandler');
const express = require('express');
const router = express.Router();

router.get('/', asyncHandler(require('./parse-url')));

module.exports = router;