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
const getPortalDetailsFromAddress = require('../../../domain/portal/getPortalDetails');

const apiURL = config.SUBGRAPH_API;

agenda.define(jobs.EDITED_FILE_JOB, async (job, done) => {
  try {
    const eventName = 'editedFiles';
    const eventProcessed = await EventProcessor.findOne({});
    let editedFileEventsProcessed = 0;
    if (eventProcessed) {
      editedFileEventsProcessed = eventProcessed.editFile;
    }
    const editFileData = await axios.get(apiURL, {
      query: `{
      ${eventName}(first : 100, skip: 0, orderDirection: asc, orderBy: blockNumber) {
        fileType,
        metadataIPFSHash,
        blockNumber,
        by,
        portalAddress
      }
    }`,
    });

    const data = editFileData?.data?.data;
    const editedFiles = data[eventName];

    await Promise.all(
      editedFiles.map(async (editFile) => {
        const portal = await Portal.findOne({
          portalAddress: editFile.portalAddress,
        });
        const fileDetails = await getFileDetails({
          portal,
          fileTypeNumber: editFile.fileType,
          metadataIPFSHash,
        });
        const portalDetails = await getPortalDetailsFromAddress(
          editFile.portalAddress,
        );

        const notif = new Notification({
          portalAddress: editFile.portalAddress,
          audience: fileDetails.audience,
          forAddress: fileDetails.forAddress,
          blockNumber: editFile.blockNumber,
          type: 'editFile',
          message: `${editFile.by} edited the file - ${fileDetails.metadata.name} in portal ${portalDetails.name}`,
          content: {
            by: editFile.by,
            metadataIPFSHash: editFile.metadataIPFSHash,
            fileType: editFile.fileType,
          },
        });

        await notif.save();
      }),
    );

    await EventProcessor.updateOne(
      {},
      {
        $set: {
          editFile: editedFileEventsProcessed + editedFiles.length,
        },
      },
      { upsert: true },
    );
    done();
  } catch (err) {
    console.error('error during job', jobs.EDITED_FILE_JOB, err);
    done(err);
  }
});
