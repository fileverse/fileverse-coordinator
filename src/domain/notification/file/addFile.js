const { EventProcessor, Portal } = require('./../../../infra/database/models');
const config = require('./../../../../config');

const apiURL = config.SUBGRAPH_API;

async function addFileNotifications() {
  const eventName = 'addedFiles';
  const eventProcessed = await EventProcessor.findOne({});
  let addedFileEventsProcessed = 0;
  if (eventProcessed) {
    addedFileEventsProcessed = eventProcessed.addFile;
  }
  const addFileData = await axios.get(apiURL, {
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

  const data = addFileData?.data?.data;
  const addedFiles = data[eventName];

  await Promise.all(
    addedFiles.map(async (addFile) => {
      let audience = '';
      let forAddress = [];
      const portal = await Portal.findOne({
        portalAddress: addFile.portalAddress,
      });
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
          audience = 'inviduals';
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
  );
}

module.exports = addFileNotifications;
