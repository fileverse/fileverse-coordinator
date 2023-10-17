const getPortal = require('./getPortal');
const { Portal } = require("../../infra/database/models");

async function removeCollaborator({ portalAddress, collaborator, blockNumber }) {
  const foundPortal = await getPortal({ portalAddress });
  const foundCollaborator = foundPortal.collaborators.find((elem) => elem.address === collaborator);
  if (foundCollaborator.addedBlocknumber < blockNumber) {
    return false;
  }
  await Portal.findByIdAndUpdate(foundPortal._id, {
    $pull: {
      'collaborators.$.address': collaborator,
    }
  });
  return true;
}

module.exports = removeCollaborator;
