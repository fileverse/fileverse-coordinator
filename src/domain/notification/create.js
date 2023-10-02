const { Notification } = require('../../infra/database/models');

async function create({ audience, forAddress, message, content, type }) {
  const notification = new Notification({
    audience,
    forAddress,
    content,
    type,
    message,
  });
  await Notification.save();
  return notification;
}

module.exports = create;
