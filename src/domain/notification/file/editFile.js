const { EventProcessor, Portal } = require('./../../../infra/database/models');
const config = require('./../../../../config');

const apiURL = config.SUBGRAPH_API;

async function editFileNotifications() {
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
      let audience = '';
      let forAddress = [];
      const portal = await Portal.findOne({
        portalAddress: editFile.portalAddress,
      });
      switch (editFile.fileType) {
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
        portalAddress: editFile.portalAddress,
        audience,
        forAddress,
        blockNumber: editFile.blockNumber,
        type: 'editFile',
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
}

module.exports = editFileNotifications;
