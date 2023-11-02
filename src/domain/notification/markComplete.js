const { Notification } = require('../../infra/database/models');

async function markComplete({ portalAddress, forAddress, type }) {
  const result = await Notification.updateMany(
    {
      portalAddress,
      forAddress,
      type,
    },
    { $set: { action: false } },
  );
  console.log(result);
  return true;
}

module.exports = markComplete;
