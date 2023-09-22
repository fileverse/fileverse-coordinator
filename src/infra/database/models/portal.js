const mongoose = require('mongoose');
const { Schema } = mongoose;

const _portal = {};

_accountSchema = {
  address: {
    type: String,
    trim: true,
    lowercase: true,
  },
  addedBlocknumber: {
    type: Number,
  },
  removedBlocknumber: {
    type: Number,
  },
};

_portal.schema = new Schema({
  portalAddress: {
    type: String,
    trim: true,
    lowercase: true,
  },
  members: [_accountSchema],
  collaborators: [_accountSchema],
});

_portal.model = mongoose.model('portals', _portal.schema);

module.exports = _portal;
