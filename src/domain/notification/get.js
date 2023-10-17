const { Notification } = require("../../infra/database/models");
const formatMessage = require("../common/formatMessage");

async function get({ account, read, offset, limit, portalAddress }) {
  const criteria = {
    forAddress: account.toLowerCase(),
  };
  if (portalAddress) {
    criteria.portalAddress = portalAddress.toLowerCase();
  }
  if (read !== undefined) {
    criteria.processed = read;
  }
  const notifications = await Notification.find(criteria)
    .sort({ blockTimestamp: -1 })
    .skip(offset)
    .limit(limit)
    .populate("portalId")
    .lean();
  const formattedNotifications = notifications.map((elem) => {
    const formattedNotification = {};
    formattedNotification.portalLogo = elem.portalId && elem.portalId.logo;
    formattedNotification.portalName = elem.portalId && elem.portalId.name;
    formattedNotification.action = elem.action;
    formattedNotification._id = elem._id;
    formattedNotification.type = elem.type;
    formattedNotification.processed = elem.processed;
    formattedNotification.message = formatMessage({
      message: elem.message,
      messageVars: elem.messageVars,
      portalName: elem.portalId && elem.portalId.name,
    });
    return formattedNotification;
  });
  return formattedNotifications;
}

module.exports = get;
