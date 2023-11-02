const mongoose = require('mongoose');
const { Schema } = mongoose;

const _eventProcessor = {};

_eventProcessor.schema = new Schema({
  addedFiles: {
    type: Number,
    default: 0,
  },
  editedFiles: {
    type: Number,
    default: 0,
  },
  addedCollaborator: {
    type: Number,
    default: 0,
  },
  removedCollaborator: {
    type: Number,
    default: 0,
  },
  registeredCollaboratorKey: {
    type: Number,
    default: 0,
  },
  updatedPortalMetadata: {
    type: Number,
    default: 0,
  },
  mint: {
    type: Number,
    default: 0,
  },
  timeStamp: { type: Date, required: true, default: Date.now },
});

_eventProcessor.schema.pre('save', function (next) {
  this.timeStamp = Date.now();
  next();
});

_eventProcessor.model = mongoose.model(
  'event_processors',
  _eventProcessor.schema,
);

module.exports = _eventProcessor;
