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
        ${eventName}(first : 100, skip: ${addedFileEventsProcessed}, orderDirection: asc, orderBy: blockNumber) {
          fileType,
          metadataIPFSHash,
          blockNumber,
          by,
          portalAddress
        }
      }`,
    });

    const data = addFileData?.data?.data;
    const addedFiles = data[eventName];
    await Promise.all(
      addedFiles.map(async (addFile) => {
        const portal = await Portal.findOne({
          portalAddress: addFile.portalAddress,
        });

        const fileDetails = await getFileDetails({
          portal,
          fileTypeNumber: addFile.fileType,
          metadataIPFSHash,
        });
        const portalDetails = await getPortalDetailsFromAddress(
          addFile.portalAddress,
        );

        const notif = new Notification({
          portalAddress: addFile.portalAddress,
          audience: fileDetails.audience,
          forAddress: fileDetails.forAddress,
          blockNumber: addFile.blockNumber,
          type: 'addFile',
          message: `${addFile.by} added ${fileDetails.fileType} file - ${fileDetails.metadata.name} in portal ${portalDetails.name}`,
          content: {
            by: addFile.by,
            metadataIPFSHash: addFile.metadataIPFSHash,
            fileType: addFile.fileType,
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
  }
});
