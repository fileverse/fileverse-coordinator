const Common = require("../../../domain/common");
const Portal = require("../../../domain/portal");

async function processMintEvent({ portalAddress, by }) {
  await Portal.getPortal({ portalAddress });
}

async function processUpdatedPortalMetadataEvent({
  portalAddress,
  ipfsHash,
  by,
}) {
  const metadata = await Common.resolveIPFSHash(ipfsHash);
  await Portal.updatePortal({ portalAddress, ipfsHash, metadata });
  const latestPortal = await Portal.getPortal({ portalAddress });
  console.log(latestPortal, by);
}

async function processAddedCollaboratorEvent({
  portalAddress,
  collaborator,
  blockNumber,
  by,
}) {
  await Portal.addCollaborator({ portalAddress, collaborator, blockNumber });
  const latestPortal = await Portal.getPortal({ portalAddress });
  console.log(latestPortal, by);
}

async function processRegisteredCollaboratorKeysEvent({
  portalAddress,
  collaborator,
  by,
}) {
  const latestPortal = await Portal.getPortal({ portalAddress });
  console.log(latestPortal, by);
}

async function processRemovedCollaboratorEvent({
  portalAddress,
  collaborator,
  by,
}) {
  await Portal.removeCollaborator({ portalAddress, collaborator });
  const latestPortal = await Portal.getPortal({ portalAddress });
  console.log(latestPortal, by);
}

async function processEvent(event) {
  if (event.eventName === "mint") {
    await processMintEvent({
      portalAddress: event.portalAddress,
      by: event.data.account,
    });
  }
  if (event.eventName === "updatedPortalDatas") {
    // update data in portal collection
    // send notification that portal metadata was updated to collaborators
    await processUpdatedPortalMetadataEvent({
      portalAddress: event.portalAddress,
      ipfsHash: event.data.metadataIPFSHash,
      by: event.data.by,
    });
  }
  if (event.eventName === "addedCollaborators") {
    // add collaborator to portal collection
    // send individual notification to the collaborator
    await processAddedCollaboratorEvent({ portalAddress: event.portalAddress });
  }
  if (event.eventName === "registeredCollaboratorKey") {
    // send notification of someone new just joined portal to the portal collaborators
    await processRegisteredCollaboratorKeysEvent({
      portalAddress: event.portalAddress,
    });
  }
  if (event.eventName === "removedCollaborators") {
    // send notification of someone removed a collaborator from portal to portal collaborators
    await processRemovedCollaboratorEvent({
      portalAddress: event.portalAddress,
    });
  }
}

module.exports = processEvent;
