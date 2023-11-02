const express = require('express');
const router = express.Router();

const message = require('./message');
const notification = require('./notification');

router.use('/message', message);

router.use('/notification', notification);

module.exports = router;
