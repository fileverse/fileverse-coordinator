const { Notification } = require('../../infra/database/models');

async function markRead({ portalAddressList, forAddress }) {
  const criteria = {
    forAddress,
  };
  if (portalAddressList && portalAddressList.length) {
    criteria.portalAddress = { $in: portalAddressList };
  }
  const result = await Notification.updateMany(
    criteria,
    { $set: { processed: true } },
  );
  return true;
}

module.exports = markRead;
