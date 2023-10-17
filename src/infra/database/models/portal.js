const mongoose = require("mongoose");
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
  name: { type: String, trim: true },
  logo: { type: String, trim: true },
  cover: { type: String, trim: true },
  ipfsHash: {
    type: String,
    trim: true,
  },
  collaborators: [_accountSchema],
});

_portal.schema.methods.safeObject = function () {
  const safeFields = [
    "_id",
    "portalAddress",
    "ipfsHash",
    "name",
    "logo",
    "cover",
    "collaborators",
  ];
  const newSafeObject = {};
  safeFields.forEach((elem) => {
    // eslint-disable-next-line security/detect-object-injection
    newSafeObject[elem] = this[elem];
  });
  return newSafeObject;
};

_portal.model = mongoose.model("portals", _portal.schema);

module.exports = _portal;
