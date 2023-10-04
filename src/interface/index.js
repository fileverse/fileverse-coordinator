const express = require('express');
const router = express.Router();

const message = require('./message');
const notification = require('./notification');
const login = require('./login');

router.use('/message', message);

router.use('/notification', notification);

router.post('/login', login);

module.exports = router;
