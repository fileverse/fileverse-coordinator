const { asyncHandler, asyncHandlerArray } = require('../../infra/asyncHandler');
const express = require('express');
const router = express.Router();

const get = require('./get');
const create = require('./create');
const canViewNotification = require('../middleware/canViewNotification');
const canCreateNotification = require('../middleware/canCreateNotification');
const process = require('./process');

router.post(
  '/',
  asyncHandler(canCreateNotification),
  asyncHandlerArray(create),
);

router.post(
  '/process',
  asyncHandler(canCreateNotification),
  asyncHandlerArray(process),
);

router.get('/', asyncHandler(canViewNotification), asyncHandlerArray(get));

module.exports = router;
