const Common = require("../../../domain/common");
const Portal = require("../../../domain/portal");
const createNotification = require("./createNotification");

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
  by,
  blockNumber,
  blockTimestamp,
}) {
  // add collaborator to portal collection
  // send individual notification to the collaborator
  await Portal.addCollaborator({ portalAddress, collaborator, blockNumber });
  const latestPortal = await Portal.getPortal({ portalAddress });
  await createNotification({
    portalAddress: latestPortal.portalAddress,
    portalId: latestPortal.portalId,
    forAddress: collaborator,
    audience: "individual",
    message:
      "${by} invited you to become collaborator of portal ${portalAddress}",
    messageVars: [
      {
        name: "portalAddress",
        value: latestPortal.portalAddress,
      },
      {
        name: "by",
        value: by,
      },
    ],
    type: "collaboratorInvite",
    by,
    blockNumber,
    blockTimestamp,
  });
}

async function processRegisteredCollaboratorKeysEvent({
  portalAddress,
  by,
  blockNumber,
  blockTimestamp,
}) {
  const latestPortal = await Portal.getPortal({ portalAddress });
  latestPortal.collaborators.map(async ({ address }) => {
    if (by === address) return;
    // create notification for each collaborator
    await createNotification({
      portalAddress: latestPortal.portalAddress,
      portalId: latestPortal.portalId,
      forAddress: address,
      audience: "collaborator_only",
      message: "${by} joined the portal ${portalAddress}",
      messageVars: [
        {
          name: "portalAddress",
          value: latestPortal.portalAddress,
        },
        {
          name: "by",
          value: by,
        },
      ],
      type: "collaboratorJoin",
      by,
      blockNumber,
      blockTimestamp,
    });
  });
}

async function processRemovedCollaboratorEvent({
  portalAddress,
  collaborator,
  by,
  blockNumber,
  blockTimestamp,
}) {
  await Portal.removeCollaborator({ portalAddress, collaborator });
  const latestPortal = await Portal.getPortal({ portalAddress });
  latestPortal.collaborators.map(async ({ address }) => {
    // create notification for each collaborator
    await createNotification({
      portalAddress: latestPortal.portalAddress,
      portalId: latestPortal.portalId,
      forAddress: address,
      audience: "collaborator_only",
      message: "${account} was removed from portal ${portalAddress} by ${by}",
      messageVars: [
        {
          name: "portalAddress",
          value: latestPortal.portalAddress,
        },
        {
          name: "account",
          value: collaborator,
        },
        {
          name: "by",
          value: by,
        },
      ],
      type: "collaboratorRemove",
      by,
      blockNumber,
      blockTimestamp,
    });
  });
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
    await processAddedCollaboratorEvent({
      portalAddress: event.portalAddress,
      collaborator: event.data.account,
      by: event.data.by,
      blockNumber: event.blockNumber,
      blockTimestamp: event.blockTimestamp,
    });
  }
  if (event.eventName === "registeredCollaboratorKey") {
    // send notification of someone new just joined portal to the portal collaborators
    await processRegisteredCollaboratorKeysEvent({
      portalAddress: event.portalAddress,
      by: event.data.account,
      blockNumber: event.blockNumber,
      blockTimestamp: event.blockTimestamp,
    });
  }
  if (event.eventName === "removedCollaborators") {
    // send notification of someone removed a collaborator from portal to portal collaborators
    await processRemovedCollaboratorEvent({
      portalAddress: event.portalAddress,
      collaborator: event.data.account,
      by: event.data.by,
      blockNumber: event.blockNumber,
      blockTimestamp: event.blockTimestamp,
    });
  }
}

module.exports = processEvent;
