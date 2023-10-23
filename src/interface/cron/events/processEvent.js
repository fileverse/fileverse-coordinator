const Common = require("../../../domain/common");
const Portal = require("../../../domain/portal");
const createNotification = require("./createNotification");
const completeNotificationAction = require("./completeNotificationAction");

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
  await Portal.getPortal({ portalAddress });
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
    portalId: latestPortal._id,
    forAddress: collaborator,
    audience: "individuals",
    message:
      "{{by}} invited you to become collaborator of portal {{portalAddress}}",
    messageVars: [
      {
        name: "portalAddress",
        value: latestPortal.portalAddress,
        type: 'address'
      },
      {
        name: "by",
        value: by,
        type: 'address'
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
  // disable invite notification action
  await completeNotificationAction({
    portalAddress: latestPortal.portalAddress,
    forAddress: by,
    type: 'collaboratorInvite'
  });
  const allPromises = latestPortal.collaborators.map(async ({ address }) => {
    if (by === address) return;
    // create notification for each collaborator
    await createNotification({
      portalAddress: latestPortal.portalAddress,
      portalId: latestPortal._id,
      forAddress: address,
      audience: "collaborators_only",
      message: "{{by}} joined the portal {{portalAddress}}",
      messageVars: [
        {
          name: "portalAddress",
          value: latestPortal.portalAddress,
          type: 'address'
        },
        {
          name: "by",
          value: by,
          type: 'address'
        },
      ],
      type: "collaboratorJoin",
      by,
      blockNumber,
      blockTimestamp,
    });
  });
  await Promise.all(allPromises);
}

async function processRemovedCollaboratorEvent({
  portalAddress,
  collaborator,
  by,
  blockNumber,
  blockTimestamp,
}) {
  await Portal.removeCollaborator({ portalAddress, collaborator, blockNumber });
  const latestPortal = await Portal.getPortal({ portalAddress });
  // disable invite notification action
  await completeNotificationAction({
    portalAddress: latestPortal.portalAddress,
    forAddress: collaborator,
    type: 'collaboratorInvite'
  });
  await createNotification({
    portalAddress: latestPortal.portalAddress,
    portalId: latestPortal._id,
    forAddress: collaborator,
    audience: "individuals",
    message:
      "{{account}} was removed from portal {{portalAddress}} by {{by}}",
    messageVars: [
      {
        name: "portalAddress",
        value: latestPortal.portalAddress,
        type: 'address'
      },
      {
        name: "account",
        value: collaborator,
        type: 'address'
      },
      {
        name: "by",
        value: by,
        type: 'address'
      },
    ],
    type: "collaboratorRemove",
    by,
    blockNumber,
    blockTimestamp,
  });
  const allPromises = latestPortal.collaborators.map(async ({ address }) => {
    if (by === address) return;
    // create notification for each collaborator
    await createNotification({
      portalAddress: latestPortal.portalAddress,
      portalId: latestPortal._id,
      forAddress: address,
      audience: "collaborators_only",
      message: "{{account}} was removed from portal {{portalAddress}} by {{by}}",
      messageVars: [
        {
          name: "portalAddress",
          value: latestPortal.portalAddress,
          type: 'address'
        },
        {
          name: "account",
          value: collaborator,
          type: 'address'
        },
        {
          name: "by",
          value: by,
          type: 'address'
        },
      ],
      type: "collaboratorRemove",
      by,
      blockNumber,
      blockTimestamp,
    });
  });
  await Promise.all(allPromises);
}

async function getNotificationTypeFromFileDataType(fileDataType, created = false) {
  if (fileDataType === 'dPage') {
    return created ? 'dPagePublish': 'dPageEdit';
  }
  if (fileDataType === 'whiteboard') {
    return created ? 'whiteboardPublish': 'whiteboardEdit';
  }
  if (fileDataType === 'dDoc') {
    return created ? 'dDocPublish': 'dDocEdit';
  }
  if (fileDataType === 'file') {
    return created ? 'addFile': 'editFile';
  }
  return created ? 'addFile': 'editFile';
}

async function getFileTypeText(fileType) {
  if (fileType === '0' || fileType === 0) {
    return 'public';
  }
  if (fileType === '1' || fileType === 1) {
    return 'private';
  }
  if (fileType === '2' || fileType === 2) {
    return 'gated';
  }
  if (fileType === '3' || fileType === 3) {
    return 'members only';
  }
  return 'private';
}

async function getFileDataTypeText(fileDataType) {
  if (fileDataType === 0 || fileDataType === '0') {
    return 'file';
  }
  if (fileDataType === 1 || fileDataType === '1') {
    return 'whiteboard';
  }
  if (fileDataType === 2 || fileDataType === '2') {
    return 'DDoc';
  }
  if (fileDataType === 4 || fileDataType === '4') {
    return 'DPage';
  }
  return 'file';
}

async function extractFileDataType(metadata) {
  return metadata?.source;
}

async function processAddedFileEvent({
  portalAddress,
  fileMetdataIPFSHash,
  fileId,
  fileType,
  by,
  blockNumber,
  blockTimestamp,
}) {
  fileType = parseInt(fileType, 10);
  const fileMetadata = await Common.resolveIPFSHash(fileMetdataIPFSHash);
  const fileDataType = await extractFileDataType(fileMetadata);
  const fileTypeText = await getFileTypeText(fileType);
  const fileDataTypeText = await getFileDataTypeText(fileDataType);
  const notificationType = await getNotificationTypeFromFileDataType(fileDataType, true);
  const latestPortal = await Portal.getPortal({ portalAddress });
  if (fileType === 1 || fileType === 0) {
    const allPromises = latestPortal.collaborators.map(async ({ address }) => {
      if (by === address) return;
      // create notification for each collaborator
      await createNotification({
        portalAddress: latestPortal.portalAddress,
        portalId: latestPortal._id,
        forAddress: address,
        audience: "collaborators_only",
        message: `{{by}} uploaded a {{fileTypeText}} {{fileDataTypeText}} "{{fileName}}" to portal "{{portalAddress}}"`,
        messageVars: [
          {
            name: "portalAddress",
            value: latestPortal.portalAddress,
            type: 'address'
          },
          {
            name: "fileId",
            value: fileId,
            type: 'number'
          },
          {
            name: "fileName",
            value: fileMetadata && fileMetadata.name,
            type: 'string'
          },
          {
            name: "fileType",
            value: fileTypeText,
            type: 'string'
          },
          {
            name: "fileDataType",
            value: fileDataTypeText,
            type: 'string'
          },
          {
            name: "by",
            value: by,
            type: 'address'
          },
        ],
        type: notificationType,
        by,
        blockNumber,
        blockTimestamp,
      });
    });
    await Promise.all(allPromises);
  }
}

async function processEditedFileEvent({
  portalAddress,
  fileMetdataIPFSHash,
  fileId,
  fileType,
  by,
  blockNumber,
  blockTimestamp,
}) {
  fileType = parseInt(fileType, 10);
  const fileMetadata = await Common.resolveIPFSHash(fileMetdataIPFSHash);
  const fileDataType = await extractFileDataType(fileMetadata);
  const fileTypeText = await getFileTypeText(fileType);
  const fileDataTypeText = await getFileDataTypeText(fileDataType);
  const notificationType = await getNotificationTypeFromFileDataType(fileDataType, false);
  const latestPortal = await Portal.getPortal({ portalAddress });
  if (fileType === 1 || fileType === 0) {
    const allPromises = latestPortal.collaborators.map(async ({ address }) => {
      if (by === address) return;
      // create notification for each collaborator
      await createNotification({
        portalAddress: latestPortal.portalAddress,
        portalId: latestPortal._id,
        forAddress: address,
        audience: "collaborators_only",
        message: `{{by}} edited a {{fileTypeText}} {{fileDataTypeText}} "{{fileName}}" on portal "{{portalAddress}}"`,
        messageVars: [
          {
            name: "portalAddress",
            value: latestPortal.portalAddress,
            type: 'address'
          },
          {
            name: "fileId",
            value: fileId,
            type: 'number'
          },
          {
            name: "fileName",
            value: fileMetadata.name,
            type: 'number'
          },
          {
            name: "fileType",
            value: fileTypeText,
            type: 'string'
          },
          {
            name: "fileDataType",
            value: fileDataTypeText,
            type: 'string'
          },
          {
            name: "by",
            value: by,
            type: 'address'
          },
        ],
        type: notificationType,
        by,
        blockNumber,
        blockTimestamp,
      });
    });
    await Promise.all(allPromises);
  }
}

async function processEvent(event) {
  if (event.eventName === "mints") {
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
  if (event.eventName === "registeredCollaboratorKeys") {
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
  if (event.eventName === "addedFiles") {
    // send notification of someone removed a collaborator from portal to portal collaborators
    await processAddedFileEvent({
      portalAddress: event.portalAddress,
      fileMetdataIPFSHash: event.data.metadataIPFSHash,
      fileId: event.data.fileId,
      fileType: event.data.fileType,
      by: event.data.by,
      blockNumber: event.blockNumber,
      blockTimestamp: event.blockTimestamp,
    });
  }
  if (event.eventName === "editedFiles") {
    // send notification of someone removed a collaborator from portal to portal collaborators
    await processEditedFileEvent({
      portalAddress: event.portalAddress,
      fileMetdataIPFSHash: event.data.metadataIPFSHash,
      fileId: event.data.fileId,
      fileType: event.data.fileType,
      by: event.data.by,
      blockNumber: event.blockNumber,
      blockTimestamp: event.blockTimestamp,
    });
  }
}

module.exports = processEvent;
