const mongoose = require("mongoose");
const { Schema } = mongoose;
const _event = {};
const { EVENT_PROCESS_MAX_RETRIES } = require("../../../constants");

_event.schema = new Schema({
  uuid: {
    type: String,
    unique: true
  },
  portalAddress: {
    type: String,
    lowercase: true,
    trim: true,
  },
  data: {
    type: Object,
    trim: true,
  },
  eventName: {
    type: String,
  },
  jobName: {
    type: String,
  },
  blockNumber: { type: Number, default: 0 },
  blockTimestamp: { type: Number, default: 0 },
  processed: { type: Boolean, default: false },
  timeStamp: { type: Date, required: true, default: Date.now },
  retries: {
    type: Number, required: true, default: 0, Range: { min: 0, max: EVENT_PROCESS_MAX_RETRIES }
  },
}
);

_event.schema.pre("save", function (next) {
  this.timeStamp = Date.now();
  next();
});

_event.schema.methods.safeObject = function () {
  const safeFields = [
    "_id",
    "portalAddress",
    "data",
    "eventName",
    "processed",
    "timeStamp",
    "blockNumber",
    "blockTimestamp",
    "jobName",
    "retries"
  ];
  const newSafeObject = {};
  safeFields.forEach((elem) => {
    // eslint-disable-next-line security/detect-object-injection
    newSafeObject[elem] = this[elem];
  });
  return newSafeObject;
};

_event.model = mongoose.model("events", _event.schema);

module.exports = _event;
