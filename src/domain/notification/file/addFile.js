const { EventProcessor, Portal } = require('./../../../infra/database/models');
const config = require('./../../../../config');
const axios = require('axios');

const apiURL = config.SUBGRAPH_API;

async function addFileNotifications() {
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
      let audience = '';
      let forAddress = [];
      const portal = await Portal.findOne({
        portalAddress: addFile.portalAddress,
      });
      if (!portal) {
        console.log('portal', addFile.portalAddress);
      } else {
        console.log({ portal });
      }
      switch (addFile.fileType) {
        case '0': {
          // Public
          audience = 'public';
          forAddress = portal.members.concat(portal.collaborators);
          break;
        }
        case '1': {
          // private, collaborators only
          audience = 'collaborators_only';
          forAddress = portal.collaborators;
          break;
        }
        case '2': {
          // gated
          audience = 'individuals';
          forAddress = portal.collaborators.concat(portal.members);
          break;
        }
        case '3': {
          // members
          audience = 'members_only';
          forAddress = portal.members;
          break;
        }
        default: {
          // FileType not valid
          return;
        }
      }

      const notif = new Notification({
        portalAddress: addFile.portalAddress,
        audience,
        forAddress,
        blockNumber: addFile.blockNumber,
        type: 'addFile',
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
}

module.exports = addFileNotifications;
