const { asyncHandler, asyncHandlerArray } = require('../../infra/asyncHandler');
const express = require('express');
const router = express.Router();

const get = require('./get');
const create = require('./create');
const canViewNotification = require('../middleware/canViewNotification');
const canCreateNotification = require('../middleware/canCreateNotification');
const process = require('./process');
const unread = require('./unread');
const markRead = require('./markRead');
const reject = require('./reject');

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

router.post(
  '/mark-read',
  asyncHandler(canCreateNotification),
  asyncHandlerArray(markRead),
);

router.post(
  '/reject',
  asyncHandler(canCreateNotification),
  asyncHandlerArray(reject),
);

router.get('/', asyncHandler(canViewNotification), asyncHandlerArray(get));

module.exports = router;
