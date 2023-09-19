const mongoose = require('mongoose');
const { Schema } = mongoose;

const _notification = {};

_notification.schema = new Schema({
  portalAddress: {
    type: String,
    lowercase: true,
    trim: true,
  },
  forAddress: [{ type: String, lowercase: true, trim: true }],
  audience: {
    type: String,
    enum: ['collaborators_only', 'members_only', 'individuals'],
  },
  content: {
    type: String,
    trim: true,
  },
  processed: { type: Boolean, default: false },
  timeStamp: { type: Date, required: true, default: Date.now },
});

_notification.schema.pre('save', function (next) {
  this.timeStamp = Date.now();
  next();
});

_notification.schema.methods.safeObject = function () {
  const safeFields = [
    '_id',
    'portalAddress',
    'forAddress',
    'audience',
    'content',
    'processed',
    'timeStamp',
  ];
  const newSafeObject = {};
  safeFields.forEach((elem) => {
    // eslint-disable-next-line security/detect-object-injection
    newSafeObject[elem] = this[elem];
  });
  return newSafeObject;
};

_notification.model = mongoose.model('notifications', _notification.schema);

module.exports = _notification;
