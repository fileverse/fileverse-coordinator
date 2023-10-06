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
  portalMetadataIPFSHash: {
    type: String,
    trim: true,
  },
  name: { type: String },
  logo: { type: String },
  members: [_accountSchema],
  collaborators: [_accountSchema],
});

_portal.schema.methods.safeObject = function () {
  const safeFields = ['_id', 'portalAddress', 'collaborators', 'members'];
  const newSafeObject = {};
  safeFields.forEach((elem) => {
    // eslint-disable-next-line security/detect-object-injection
    newSafeObject[elem] = this[elem];
  });
  return newSafeObject;
};

_portal.model = mongoose.model('portals', _portal.schema);

module.exports = _portal;
