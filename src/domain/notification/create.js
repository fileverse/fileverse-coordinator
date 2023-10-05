const { Notification, Portal } = require('../../infra/database/models');
const _errorHandler = require('../../infra/errorHandler');

const getPortalDetails = require('../portal/getPortalDetails');

async function create({
  audience,
  forAddress,
  message,
  content,
  type,
  portalAddress,
}) {
  const portal = await Portal.findOne({ portalAddress });
  if (!portal) {
    return _errorHandler.throwError({
      code: 404,
      message: `Portal with the portal address ${portalAddress} does not exists`,
    });
  }

  const portalDetails = getPortalDetails(portal);

  if (audience === 'public') {
    forAddress = portalDetails.membersAndCollabs;
  } else if (audience === 'members_only') {
    forAddress = portalDetails.members;
  } else if (audience === 'collaborators_only') {
    forAddress = portalDetails.collaborators;
  }

  const notification = new Notification({
    audience,
    forAddress,
    content,
    type,
    message,
    portalAddress: portalAddress.toLowerCase(),
  });
  await notification.save();
  return notification;
}

module.exports = create;
