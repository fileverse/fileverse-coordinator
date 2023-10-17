const { asyncHandler, asyncHandlerArray } = require('../../infra/asyncHandler');
const express = require('express');
const router = express.Router();

const get = require('./get');
const create = require('./create');
const canViewNotification = require('../middleware/canViewNotification');
const canCreateNotification = require('../middleware/canCreateNotification');
const process = require('./process');
const unread = require('./unread');

router.get(
  '/unread',
  asyncHandler(canViewNotification),
  asyncHandlerArray(unread),
);

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

router.get('/', asyncHandlerArray(get));

module.exports = router;
