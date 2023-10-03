const config = require('../../../../config');
const getPortalDetails = require('../../../domain/portal/getPortalDetails');
const isAccountPresent = require('../../../domain/portal/isAccountPresent');
const {
  EventProcessor,
  Notification,
  Portal,
} = require('../../../infra/database/models');
const agenda = require('./../index');
const jobs = require('./../jobs');
const axios = require('axios');

const apiURL = config.SUBGRAPH_API;

async function addCollaboratorToPortal(addedCollab) {
  await Portal.updateOne(
    { portalAddress: addedCollab.portalAddress },
    {
      $push: {
        collaborators: {
          address: addedCollab.account,
          addedBlocknumber: addedCollab.blockNumber,
        },
      },
    },
    { upsert: true },
  );
}

async function createNotificationForAddCollaborator(addedCollab) {
  // Check if notification is alreay present
  const notificaitonPresent = await Notification.findOne({
    portalAddress: addedCollab.portalAddress,
    blockNumber: addedCollab.blockNumber,
    type: 'collaboratorJoin',
  });
  if (notificaitonPresent) return;

  // Create a new notification.
  const notification = new Notification({
    portalAddress: addedCollab.portalAddress,
    audience: 'individuals',
    forAddress: [addedCollab.account],
    content: {
      by: addedCollab.by,
      transactionHash: addedCollab.transactionHash,
    },
    blockNumber: addedCollab.blockNumber,
    type: 'collaboratorJoin',
  });

  const portalDetails = await getPortalDetails(
    addedCollab.portalMetadataIPFSHash,
  );
  if (portalDetails) {
    notification.message = `${addedCollab.account} joined the portal ${portalDetails.name}`;
    notification.content.portalLogo = portalDetails.logo;
  } else {
    notification.message = `${addedCollab.account} joined the portal ${addedCollab.portalAddress}`;
  }
  await notification.save();
}

agenda.define(jobs.ADDED_COLLABORATOR_JOB, async (job, done) => {
  try {
    const eventProcessed = await EventProcessor.findOne({});
    let addedCollabEventsProcessed = 0;
    if (eventProcessed) {
      addedCollabEventsProcessed = eventProcessed.addedCollaborator;
    }
    const eventName = 'registeredCollaboratorKeys';
    const addedCollabResult = await axios.post(apiURL, {
      query: `{
      ${eventName}(first: 5, skip: ${addedCollabEventsProcessed}, orderDirection: asc, orderBy: blockNumber) {
          portalAddress,
          blockNumber,
          account,
          transactionHash,
          portalMetadataIPFSHash,
        }
      }`,
    });

    const data = addedCollabResult?.data?.data;
    const addedCollabs = data[eventName];

    console.log(
      'Recieved entries',
      jobs.ADDED_COLLABORATOR_JOB,
      addedCollabs.length,
    );

    await Promise.all(
      addedCollabs.map(async (addedCollab) => {
        const portal = await Portal.findOne({
          portalAddress: addedCollab.portalAddress,
        });
        const alreadyAddedCollab =
          portal && isAccountPresent(portal.collaborators, addedCollab.account);
        if (!alreadyAddedCollab) {
          await addCollaboratorToPortal(addedCollab);
          await createNotificationForAddCollaborator(addedCollab);
        } else {
          if (alreadyAddedCollab.removedBlockNumber) {
            await Portal.updateOne(
              {
                portalAddress: addedCollab.portalAddress,
                'collaborators.address': addedCollab.account,
              },
              {
                $set: {
                  'collaborators.addedBlocknumber': addedCollab.blockNumber,
                },
              },
              { upsert: true },
            );
          }
        }
      }),
    );

    await EventProcessor.updateOne(
      {},
      {
        $set: {
          addedCollaborator: addedCollabEventsProcessed + addedCollabs.length,
        },
      },
    );
    done();
  } catch (err) {
    console.error(
      'Error in invited Collaborators',
      jobs.ADDED_COLLABORATOR_JOB,
      err,
    );
    done(err);
  }
});
