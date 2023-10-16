const { Notification, Portal } = require('../../infra/database/models');
const _errorHandler = require('../../infra/errorHandler');

const getPortalDetails = require('../portal/getPortalDetails');

async function getProtal({ portalAddress }) {
  const portal = await Portal.findOne({ portalAddress });
  return portal;
}

async function create({
  audience,
  forAddress,
  message,
  content,
  type,
  portalAddress,
}) {
  const portalDetails = getPortalDetails(portal);

  if (audience === 'collaborators_only') {
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
