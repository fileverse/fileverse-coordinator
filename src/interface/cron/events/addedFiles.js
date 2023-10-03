const jobs = require('../jobs');
const agenda = require('./../index');
const axios = require('axios');
const config = require('./../../../../config');
const {
  EventProcessor,
  Portal,
  Notification,
} = require('../../../infra/database/models');
const getPortalDetailsFromAddress = require('../../../domain/portal/getPortalDetails');
const getFileDetails = require('../../../domain/notification/file/getFileDetails');

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

agenda.define(jobs.ADDED_FILE_JOB, async (job, done) => {
  try {
    const eventName = 'addedFiles';
    const eventProcessed = await EventProcessor.findOne({});
    let addedFileEventsProcessed = 0;
    if (eventProcessed) {
      addedFileEventsProcessed = eventProcessed.addFile;
    }
    const addFileData = await axios.post(apiURL, {
      query: `{
        ${eventName}(first : 20, skip: ${addedFileEventsProcessed}, orderDirection: asc, orderBy: blockNumber) {
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

        const portalDetails = await getPortalDetailsFromAddress(
          addFile.portalMetadataIPFSHash,
        );

        if (!fileDetails.forAddress.includes(addFile.by)) {
          fileDetails.forAddress.push(addFile.by);
        }

        const notif = new Notification({
          portalAddress: addFile.portalAddress,
          audience: fileDetails.audience,
          forAddress: fileDetails.forAddress,
          blockNumber: addFile.blockNumber,
          type: 'addFile',
          message: `${addFile.by} added ${fileDetails.fileType} file ${
            fileDetails.metadata ? fileDetails.metadata.name : ''
          } in portal ${
            portalDetails ? portalDetails.name : addFile.portalAddress
          }`,
          content: {
            by: addFile.by,
            metadataIPFSHash: addFile.metadataIPFSHash,
            fileType: addFile.fileType,
            fileMetadata: fileDetails.metadata,
            fileId: addFile.fileId,
          },
        });
        await notif.save();
      }),
    );

    await EventProcessor.updateOne(
      {},
      {
        $set: {
          addFile: addedFileEventsProcessed + addedFiles.length,
        },
      },
      { upsert: true },
    );
    done();
  } catch (err) {
    console.error('error during job', jobs.ADDED_FILE_JOB, err);
    done(err);
  } finally {
    console.log('Done job', jobs.ADDED_FILE_JOB);
  }
});
