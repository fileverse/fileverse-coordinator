const { Notification } = require('../../infra/database/models');

async function process(notifications) {
  const result = await Notification.updateMany(
    {
      _id: { $in: notifications },
    },
    { $set: { processed: true } },
  );
  console.log(result);
}

module.exports = process;
