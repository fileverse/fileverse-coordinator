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
  if (read) {
    matchQuery.processed = true;
  }

  const notifications = await Notification.find(matchQuery)
    .sort({ timeStamp: -1, blockNumber: -1 })
    .skip(offset)
    .limit(limit);

  notifications.forEach((notification, index) => {
    if (notification.message.includes(address)) {
      notification.message.replace(addresss, 'you');
      notifications[index] = notification;
    }
  });

  return notifications;
}

module.exports = get;
