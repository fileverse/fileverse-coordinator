require('../');

const _models = {
  Message: require('./message').model,
  Notification: require('./notification').model,
  Portal: require('./portal').model,
  Event: require('./event').model,
  EventProcessor: require('./eventProcessor').model,
};

module.exports = _models;
