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

function getNotificationType(whatSource) {
  switch (whatSource) {
    case 'dPage':
      return 'dPageEdit';
    case 'dDoc':
      return 'dDocEdit';
    case 'file':
      return 'editFile';
    case 'whiteboard':
      return 'whiteboardEdit';
  }
}

function getMessage({ whoEdited, whatSource, whatEdited }) {
  let message = '';
  if (whatSource === 'dPage') {
    if (whatEdited) {
      message = `${whoEdited} edited  "${whatEdited}" dPage`;
    } else {
      message = `${whoEdited} edited a dPage`;
    }
  } else if (whatSource === 'whiteboard') {
    if (whatEdited) {
      message = `${whoEdited} edited "${whatTypeAdded}" whiteboard`;
    } else {
      message = `${whoEdited} uploaded a whiteboard `;
    }
  } else if (whatSource === 'dDoc') {
    if (whatEdited) {
      message = `${whoEdited} edited "${whatEdited}" dDoc`;
    } else {
      message = `${whoEdited} edited a dDoc"`;
    }
  } else {
    if (whatEdited) {
      message = `${whoEdited} edited file "${whatEdited}"`;
    } else {
      message = `${whoEdited} edited a file`;
    }
  }
  return message;
}

agenda.define(jobs.EDITED_FILE_JOB, async (job, done) => {
  try {
    const eventName = 'editedFiles';
    const eventProcessed = await EventProcessor.findOne({});
    let editedFileCheckpt = 0;
    if (eventProcessed) {
      editedFileCheckpt = eventProcessed.editFile;
    }
    const editFileData = await axios.post(apiURL, {
      query: `{
      ${eventName}(first : 5, orderDirection: asc, orderBy: blockNumber, where:{blockNumber_gt: ${editedFileCheckpt}}) {
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

    const data = editFileData?.data?.data;
    const editedFiles = data[eventName];
    let newEditedFileCheckpt = null;
    if (editedFiles && editedFiles.length) {
      newEditedFileCheckpt = editedFiles.slice(-1)[0].blockNumber;
    }

    console.log('Recieved entries', jobs.EDITED_FILE_JOB, editedFiles.length);

    await Promise.all(
      editedFiles.map(async (editFile) => {
        const portal = await Portal.findOne({
          portalAddress: editFile.portalAddress,
        });
        const fileDetails = await getFileDetails({
          portal,
          fileTypeNumber: editFile.fileType,
          metadataIPFSHash: editFile.metadataIPFSHash,
        });

        const notifications = await Notification.find({
          portalAddress: editFile.portalAddress,
          'content.fileId': editFile.fileId,
        })
          .sort({ blockNumber: -1 })
          .limit(1);

        const prevFileMetadata =
          notifications.length && notifications[0]?.content?.fileMetadata;

        const portalDetails = await getPortalMetadata({
          portal,
          portalMetadataIPFSHash: editFile.portalMetadataIPFSHash,
        });

        if (!fileDetails.forAddress.includes(editFile.by)) {
          fileDetails.forAddress.push(editFile.by);
        }

        const notif = new Notification({
          portalAddress: editFile.portalAddress,
          audience: fileDetails.audience,
          forAddress: fileDetails.forAddress,
          blockNumber: editFile.blockNumber,
          type: getNotificationType(fileDetails.metadata.source),
          message: getMessage({
            whoEdited: editFile.by,
            whatSource: fileDetails.metadata.source,
            whatEdited: fileDetails?.metadata?.name,
          }),
          content: {
            by: editFile.by,
            metadataIPFSHash: editFile.metadataIPFSHash,
            fileType: editFile.fileType,
            fileMetadata: fileDetails.metadata,
            fileId: editFile.fileId,
            portalLogo: portal.logo,
            portalName: portal.name,
          },
        });

        if (
          editFile?.metadataIPFSHash ===
          'bafybeify3xbts44jrrcidno7gxqs5fyvf5rbx3zkncnbjaibejjetvqtqe/metadata'
        ) {
          notif.type = 'deleteFile';
          let message = `${editFile.by} deleted the ${fileDetails.metadata.source}`;
          if (prevFileMetadata && prevFileMetadata.name) {
            message += ` "${prevFileMetadata.name}"`;
          }
          notif.message = message;
        }

        await notif.save();
      }),
    );

    if (newEditedFileCheckpt) {
      await EventProcessor.updateOne(
        {},
        {
          $set: {
            editFile: newEditedFileCheckpt,
          },
        },
        { upsert: true },
      );
    }
    done();
  } catch (err) {
    console.error('error during job', jobs.EDITED_FILE_JOB, err);
    done(err);
  } finally {
    console.log('Done job', jobs.EDITED_FILE_JOB);
  }
});
