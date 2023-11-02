const { Notification } = require('../../infra/database/models');

async function unread(invokerAddress) {
  const unreadCnt = await Notification.find({
    forAddress: invokerAddress,
    processed: false,
  }).count();
  return { unreadCnt };
}

module.exports = unread;
