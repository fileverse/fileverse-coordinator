const axios = require('axios');
const config = require('../../../config');
const { Notification, Portal } = require('../../infra/database/models');
const formatAddress = require('../portal/formatAddress');
const NotificationTypes = require('./types');

async function formatMessage(notification) {
  const portal = await Portal.findOne({
    portalAddress: notification.portalAddress,
  });
  let message = notification.message;
  const portalName =
    portal && portal.name ? portal.name : notification.portalAddress;
  if (notification.type === NotificationTypes.COLLABORATOR_INVITE) {
    message = `${notification.content.by} invited you to become collaborator of portal "${portalName}"`;
  } else if (notification.type === NotificationTypes.COLLABORATOR_JOIN) {
    message = `${notification.content.account} joined the portal "${portalName}"`;
  } else if (notification.type === NotificationTypes.COLLABORATOR_REMOVE) {
    message = `${notification.content.account} were removed from portal "${portalName}"`;
  } else if (notification.type === NotificationTypes.ADD_FILE) {
    // since portalName is the last word in the message, we just change it with new portal name
    let words = message.split(' ');
    words.pop();
    words.push(`"${portalName}"`);
    message = words.join(' ');
  }
  notification.message = message;
  return notification;
}

async function get({ address, read, offset, limit, portalAddress }) {
  const matchQuery = {};
  if (address) {
    address = address.toLowerCase();
    matchQuery.forAddress = address;
  }

  if (portalAddress) {
    matchQuery.portalAddress = portalAddress.toLowerCase();
  }
  if (read !== undefined) {
    matchQuery.processed = read;
  }

  const notifications = await Notification.find(matchQuery)
    .sort({ timeStamp: -1, blockNumber: -1 })
    .skip(offset)
    .limit(limit);

  const newNotifications = await Promise.all(
    notifications.map(async (notification) => {
      notification = notification.safeObject();
      notification = await formatMessage(notification);
      const words = notification.message.split(' ');
      let newWords = [];
      words.forEach((word, index) => {
        let newWord = word;
        if (word === address) {
          newWord = index === 0 ? 'You' : 'you';
        } else if (word.startsWith('0x')) {
          newWord = formatAddress(word);
        }
        newWords.push(newWord);
      });
      notification.message = newWords.join(' ');
      return notification;
    }),
  );

  return newNotifications;
}

module.exports = get;
