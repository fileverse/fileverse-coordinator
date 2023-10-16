const { Notification } = require('../../infra/database/models');
const formatMessage = require('../common/formatMessage');

async function get({ account, read, offset, limit, portalAddress }) {
  const criteria = {
    forAddress: account.toLowerCase()
  };
  if (portalAddress) {
    criteria.portalAddress = portalAddress.toLowerCase();
  }
  if (read !== undefined) {
    matchQuery.processed = read;
  }
  const notifications = await Notification.find(matchQuery)
    .sort({ blockTimestamp: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
  const formattedNotifications = notifications.map((elem) => {
    elem.message = formatMessage({ message, messageVars });
    return elem;
  });
  return formattedNotifications;
}

module.exports = get;
