const axios = require('axios');
const config = require('../../../config');
const { Notification, Portal } = require('../../infra/database/models');
const formatAddress = require('../portal/formatAddress');
const {
  COLLABORATOR_INVITE,
  COLLABORATOR_REMOVE,
  COLLABORATOR_JOIN,
  ADD_FILE,
} = require('./types');

async function formatMessage(notification) {
  const portal = await Portal.findOne({
    portalAddress: notification.portalAddress,
  });
  let message = notification.message;
  const portalName =
    portal && portal.name ? portal.name : notification.portalAddress;
  if (notification.type === COLLABORATOR_INVITE) {
    message = `${notification.content.by} invited you to become collaborator of portal "${portalName}"`;
  } else if (notification.type === COLLABORATOR_JOIN) {
    if (notification.content.account) {
      message = `${notification.content.account} joined the portal "${portalName}"`;
    } else {
      message =
        notification.message.split(' ')[0] + ` joined the portal ${portalName}`;
    }
  } else if (notification.type === COLLABORATOR_REMOVE) {
    if (notification.content.account && notification.content.by) {
      message = `${notification.content.account} was removed from portal "${portalName}" by ${notification.content.by}`;
    } else if (notification.content.account) {
      message = `${notification.content.account} was removed from portal "${portalName}"`;
    }
  } else if (notification.type === ADD_FILE) {
    // since portalName is the last word in the message, we just change it with new p
    let words = message.split(' ');
    let lastWord = words.pop();
    while (words.length && lastWord !== 'to') {
      lastWord = words.pop();
    }
    if (words.length != 0) {
      words.push('to');
      words.push(`"${portalName}"`);
      message = words.join(' ');
    } else {
      message = notification.message;
    }
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
      console.log({ notification });
      const words = notification.message.split(' ');
      let newWords = [];
      console.log({ words });
      words.forEach((word, index) => {
        let newWord = word;
        if (word === address) {
          newWord = index === 0 ? 'You' : 'you';
        } else if (word.startsWith('0x')) {
          newWord = formatAddress(word);
        } else if (index == 1 && word === 'was' && words[0] == address) {
          newWord = 'were';
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
