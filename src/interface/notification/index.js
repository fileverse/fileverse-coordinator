const { asyncHandler, asyncHandlerArray } = require('../../infra/asyncHandler');
const express = require('express');
const router = express.Router();

const get = require('./get');
const create = require('./create');
const canViewNotification = require('../middleware/canViewNotification');
const canCreateNotification = require('../middleware/canCreateNotification');

router.post(
  '/',
  asyncHandler(canCreateNotification),
  asyncHandlerArray(create),
);
router.get('/', asyncHandler(canViewNotification), asyncHandlerArray(get));

module.exports = router;
