const { Notification } = require('../../infra/database/models');

async function create({
  portalId,
  portalAddress,
  audience,
  forAddress,
  message,
  messageVars,
  content,
  action,
  type,
  by,
  blockNumber,
  blockTimestamp,
}) {
  const notification = new Notification({
    audience,
    forAddress,
    content,
    type,
    message,
    portalAddress: portalAddress.toLowerCase(),
    portalId,
    action,
    messageVars,
    by,
    blockNumber,
    blockTimestamp,
  });
  await notification.save();
  return notification;
}

module.exports = create;
