const mongoose = require('mongoose');
const { Schema } = mongoose;

const _eventProcessor = {};

_eventProcessor.schema = new Schema({
  addMember: {
    type: Number,
    default: 0,
  },
  removeMember: {
    type: Number,
    default: 0,
  },
  addedCollaborator: {
    type: Number,
    default: 0,
  },
  removeCollaborator: {
    type: Number,
    default: 0,
  },
  invitedCollaborator: {
    type: Number,
    default: 0,
  },
  addFile: {
    type: Number,
    default: 0,
  },
  editFile: {
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
  'eventProcessors',
  _eventProcessor.schema,
);

module.exports = _eventProcessor;
