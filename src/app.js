'use strict';

/*
 * This file exports the app that is used by the server to expose the routes.
 * And make the routes visible.
 */

const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const basicAuth = require('express-basic-auth');
const Agendash = require('agendash');

const router = require('./interface');
const { errorHandler } = require('./interface/middleware');
const { asyncHandler } = require('./infra/asyncHandler');
const ucan = require('./infra/ucan');
const config = require('./../config');
const agenda = require('./interface/cron');

// Express App
const app = express();

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// parse application/json
app.use(express.json());

// Use default logger for now
app.use(logger('combined'));

// app.use(cors());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: false,
  }),
);

app.use(
  '/dash',
  basicAuth({
    users: {
      admin: config.AGENDA_CRON_PASSWORD,
    },
    challenge: true,
  }),
  Agendash(agenda),
);

app.use(asyncHandler(ucan.verify));

// This is to check if the service is online or not
app.use('/ping', function (req, res) {
  res.json({ reply: 'pong' });
  res.end();
});

app.use('/', router);

app.use(errorHandler);

// Export the express app instance
module.exports = app;
