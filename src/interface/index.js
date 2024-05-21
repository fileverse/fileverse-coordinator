const express = require('express');
const router = express.Router();

const message = require('./message');
const notification = require('./notification');
const parseUrl = require('./urlParser');

router.use('/message', message);
router.use('/parse-url', parseUrl)
router.use('/notification', notification);

module.exports = router;
