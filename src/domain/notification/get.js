const axios = require('axios');
const config = require('../../../config');
const { Notification } = require('../../infra/database/models');

async function get({ address, read, offset, limit, portalAddress }) {
  const matchQuery = {};
  if (address) {
    matchQuery.forAddress = [address];
  }
  matchQuery.processed = false;
  if (portalAddress) {
    matchQuery.portalAddress = portalAddress;
  }

  const notifications = await Notification.find(matchQuery)
    .sort({ blockTimestamp: -1 })
    .skip(offset)
    .limit(limit);

  return notifications;
}

module.exports = get;
