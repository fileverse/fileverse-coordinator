require('../');

const _models = {
  Message: require('./message').model,
  Notification: require('./notification').model,
};

module.exports = _models;
