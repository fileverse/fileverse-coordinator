const getPortal = require('./getPortal');
const { Portal } = require("../../infra/database/models");

async function addCollaborator({ portalAddress, collaborator, blockNumber }) {
  const foundPortal = await getPortal({ portalAddress });
  const collaboratorList = foundPortal.collaborators;
  const finalList = collaboratorList.filter(elem => elem.address !== collaborator);
  const foundCollaborator = collaboratorList.find((elem) => elem.address === collaborator);
  if (!foundCollaborator) {
    finalList.push({ address: collaborator, addedBlockNumber: blockNumber });
  } else {
    finalList.push({
      address: collaborator,
      removedBlockNumber: foundCollaborator.removedBlockNumber,
      addedBlockNumber: blockNumber,
    });
  }
  await Portal.findByIdAndUpdate(foundPortal._id, {
    $set: {
      collaborators: finalList,
    }
  });
  return true;
}

module.exports = addCollaborator;
