const { Notification } = require('../../infra/database/models');

async function reject({ notificationId, forAddress }) {
  await Notification.updateOne(
    {
      _id: notificationId,
      forAddress,
    },
    { $set: { action: false } },
  );
  return true;
}

module.exports = reject;
