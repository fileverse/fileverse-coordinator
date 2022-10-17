const mongoose = require('mongoose');
const { Schema } = mongoose;

const _message = {};

_message.schema = new Schema({
  invokerAddress: { type: String, lowercase: true },
  contractAddress: {
    type: String,
    lowercase: true,
    required: true,
  },
  topic: {
    type: String,
    enum: [
      'server_decryption_key',
      'server_encryption_key',
      'key_request',
    ],
    required: true,
  },
  forAddress: { type: String, lowercase: true, index: true },
  content: { type: String, required: true },
  processed: { type: Boolean, default: false },
  timeStamp: { type: Date, required: true, default: Date.now },
});

_message.schema.pre('save', function (next) {
  this.timeStamp = Date.now();
  next();
});

_message.schema.methods.safeObject = function () {
  const safeFields = ['_id', 'invokerAddress', 'contractAddress', 'topic', 'forAddress', 'content', 'timeStamp'];
  const newSafeObject = {};
  safeFields.forEach((elem) => {
    // eslint-disable-next-line security/detect-object-injection
    newSafeObject[elem] = this[elem];
  });
  return newSafeObject;
};

_message.model = mongoose.model('messages', _message.schema);

module.exports = _message;
