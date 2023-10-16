const Portal = require("../../../domain/portal");

async function processMintEvent({ portalAddress }) {
  const portal = await Portal.getPortal({ portalAddress });
}

async function processUpdatedPortalMetadataEvent({ portalAddress }) {
  const portal = await Portal.getPortal({ portalAddress });
}

async function processAddedCollaboratorEvent({ portalAddress }) {
  const portal = await Portal.getPortal({ portalAddress });
}

async function processRegisteredCollaboratorKeysEvent({ portalAddress }) {
  const portal = await Portal.getPortal({ portalAddress });
}

async function processRemovedCollaboratorEvent({ portalAddress }) {
  const portal = await Portal.getPortal({ portalAddress });
}

async function processEvent(event) {
  if (event.eventName === "mint") {
    await processMintEvent({ portalAddress: event.portalAddress });
  }
  if (event.eventName === "updatedPortalDatas") {
    // update data in portal collection
    // send notification that portal metadata was updated to collaborators
    await processUpdatedPortalMetadataEvent({
      portalAddress: event.portalAddress,
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

module.exports = {};
