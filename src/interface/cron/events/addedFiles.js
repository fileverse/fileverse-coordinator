const jobs = require('../jobs');
const agenda = require('./../index');
const axios = require('axios');
const config = require('./../../../../config');
const {
  EventProcessor,
  Portal,
  Notification,
} = require('../../../infra/database/models');
const getFileDetails = require('../../../domain/notification/file/getFileDetails');
const getPortalMetadata = require('../../../domain/portal/getPortalMetadata');
const formatAddress = require('../../../domain/portal/formatAddress');

const apiURL = config.SUBGRAPH_API;

async function notificationAlreadyPresent(addedFile) {
  const foundNotif = await Notification.findOne({
    portalAddress: addedFile.portalAddress,
    blockNumber: addedFile.blockNumber,
    'content.metadataIPFSHash': addedFile.metadataIPFSHash,
  });
  if (foundNotif) {
    return true;
  }
  return false;
}

function getNotificationType(whatSource) {
  switch (whatSource) {
    case 'dPage':
      return 'dPagePublish';
    case 'dDoc':
      return 'dDocPublish';
    case 'file':
      return 'addFile';
    case 'whiteboard':
      return 'whiteboardPublish';
  }
}

function getMessage({
  whoAdded,
  whatTypeAdded,
  whatSource,
  whatAdded,
  onWhatPortal,
}) {
  let message = '';
  if (whatSource === 'dPage') {
    message = `${whoAdded} published a ${whatTypeAdded} dPage to "${onWhatPortal}"`;
    if (!whatAdded) {
      message += ` named "${whatAdded}"`;
    }
  } else if (whatSource === 'whiteboard') {
    if (whatAdded) {
      message = `${whoAdded} uploaded a ${whatTypeAdded} whiteboard "${whatAdded}" to "${onWhatPortal}"`;
    } else {
      message = `${whoAdded} uploaded a ${whatTypeAdded} whiteboard to "${onWhatPortal}"`;
    }
  } else if (whatSource === 'dDoc') {
    if (whatAdded) {
      message = `${whoAdded} uploaded a ${whatTypeAdded} dDoc "${whatAdded}" to "${onWhatPortal}"`;
    } else {
      message = `${whoAdded} uploaded a ${whatTypeAdded} dDoc to "${onWhatPortal}"`;
    }
  } else {
    if (whatAdded) {
      message = `${whoAdded} uploaded a ${whatTypeAdded} file "${whatAdded}" to "${onWhatPortal}"`;
    } else {
      message = `${whoAdded} uploaded a ${whatTypeAdded} file to "${onWhatPortal}"`;
    }
  }
  return message;
}

agenda.define(jobs.ADDED_FILE_JOB, async (job, done) => {
  try {
    const eventName = 'addedFiles';
    const eventProcessed = await EventProcessor.findOne({});
    let addedFileCheckpt = 0;
    if (eventProcessed) {
      addedFileCheckpt = eventProcessed.addFile;
    }
    const addFileData = await axios.post(apiURL, {
      query: `{
        ${eventName}(first : 5, orderDirection: asc, orderBy: blockNumber, where: {blockNumber_gt: ${addedFileCheckpt}}) {
          fileType,
          metadataIPFSHash,
          blockNumber,
          by,
          fileId,
          portalAddress,
          portalMetadataIPFSHash
        }
      }`,
    });

    const data = addFileData?.data?.data;
    const addedFiles = data[eventName];

    let newAddedFileCheckpt = null;
    if (addedFiles && addedFiles.length) {
      newAddedFileCheckpt = addedFiles.slice(-1)[0].blockNumber;
    }

    console.log('Recieved entries', jobs.ADDED_FILE_JOB, addedFiles.length);

    await Promise.all(
      addedFiles.map(async (addFile) => {
        if (await notificationAlreadyPresent(addFile)) {
          return;
        }

        const portal = await Portal.findOne({
          portalAddress: addFile.portalAddress,
        });

        const fileDetails = await getFileDetails({
          portal,
          fileTypeNumber: addFile.fileType,
          metadataIPFSHash: addFile.metadataIPFSHash,
        });

        const portalDetails = await getPortalMetadata({
          portal,
          portalMetadataIPFSHash: addFile.portalMetadataIPFSHash,
        });

        if (!fileDetails.forAddress.includes(addFile.by)) {
          fileDetails.forAddress.push(addFile.by);
        }

        const notif = new Notification({
          portalAddress: addFile.portalAddress,
          audience: fileDetails.audience,
          forAddress: fileDetails.forAddress,
          blockNumber: addFile.blockNumber,
          type: getNotificationType(fileDetails.metadata.source),
          message: getMessage({
            whoAdded: addFile.by,
            whatTypeAdded: fileDetails.fileType,
            whatSource: fileDetails.metadata.source,
            whatAdded: fileDetails?.metadata?.name,
            onWhatPortal: portalDetails?.name
              ? portalDetails.name
              : formatAddress(addFile.portalAddress),
          }),
          content: {
            by: addFile.by,
            metadataIPFSHash: addFile.metadataIPFSHash,
            fileType: addFile.fileType,
            fileMetadata: fileDetails.metadata,
            fileId: addFile.fileId,
            portalLogo: portalDetails.logo,
            portalName: portalDetails.name,
          },
        });
        await notif.save();
      }),
    );

    if (newAddedFileCheckpt) {
      await EventProcessor.updateOne(
        {},
        {
          $set: {
            addFile: newAddedFileCheckpt,
          },
        },
        { upsert: true },
      );
    }
    done();
  } catch (err) {
    console.error('error during job', jobs.ADDED_FILE_JOB, err);
    done(err);
  } finally {
    console.log('Done job', jobs.ADDED_FILE_JOB);
  }
});
