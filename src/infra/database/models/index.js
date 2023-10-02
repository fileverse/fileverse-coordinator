require('../');

const _models = {
  Message: require('./message').model,
  Notification: require('./notification').model,
  Portal: require('./portal').model,
  EventProcessor: require('./eventProcessor').model,
};

module.exports = _models;
