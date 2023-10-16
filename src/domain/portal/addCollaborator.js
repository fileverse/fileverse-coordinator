const getPortal = require('./getPortal');
const { Portal } = require("../../infra/database/models");

async function addCollaborator({ portalAddress, collaborator, blockNumber }) {
  const foundPortal = await getPortal({ portalAddress });
  await Portal.findByIdAndUpdate(foundPortal._id, {
    $push: {
      collaborators: {
        address: collaborator,
        addedBlocknumber: blockNumber,
      }
    }
  });
  return true;
}

module.exports = addCollaborator;
