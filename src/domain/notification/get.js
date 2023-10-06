const axios = require('axios');
const config = require('../../../config');
const { Notification } = require('../../infra/database/models');
const formatAddress = require('../portal/formatAddress');

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

  notifications.forEach((notification, index) => {
    notification = notification.safeObject();
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
    notifications[index] = notification;
  });

  return notifications;
}

module.exports = get;
