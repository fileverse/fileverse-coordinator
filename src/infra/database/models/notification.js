const mongoose = require("mongoose");
const { Schema } = mongoose;

const _notification = {};

_notification.schema = new Schema({
  portalId: { type: Schema.Types.ObjectId },
  portalAddress: {
    type: String,
    lowercase: true,
    trim: true,
  },
  forAddress: [{ type: String, lowercase: true, trim: true }],
  audience: {
    type: String,
    enum: ["collaborators_only", "members_only", "individuals", "public"],
  },
  content: {
    type: Object,
    trim: true,
  },
  action: {
    type: Boolean,
    default: true,
  },
  message: { type: String, trim: true },
  type: {
    type: String,
    enum: [
      "addFile",
      "editFile",
      "deleteFile",
      "collaboratorJoin",
      "collaboratorInvite",
      "collaboratorRemove",
      "memberJoin",
      "memberRemove",
      "liveCollaborationInvite",
      "fileMessage",
      "dPageComment",
      "whiteboardPublish",
      "whiteboardEdit",
      "dPagePublish",
      "dPageEdit",
      "dDocPublish",
      "dDocEdit",
    ],
  },
  blockNumber: { type: Number, default: 0 },
  processed: { type: Boolean, default: false },
  timeStamp: { type: Date, required: true, default: Date.now },
});

_notification.schema.pre("save", function (next) {
  this.timeStamp = Date.now();
  next();
});

_notification.schema.methods.safeObject = function () {
  const safeFields = [
    "_id",
    "portalAddress",
    "forAddress",
    "audience",
    "content",
    "processed",
    "action",
    "timeStamp",
    "type",
    "message",
    "blockNumber",
  ];
  const newSafeObject = {};
  safeFields.forEach((elem) => {
    // eslint-disable-next-line security/detect-object-injection
    newSafeObject[elem] = this[elem];
  });
  return newSafeObject;
};

_notification.model = mongoose.model("notifications", _notification.schema);

module.exports = _notification;
