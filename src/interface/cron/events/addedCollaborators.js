const config = require('../../../../config');
const getPortalDetails = require('../../../domain/portal/getPortalDetails');
const getPortalMetadata = require('../../../domain/portal/getPortalMetadata');
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

async function createNotificationForAddCollaborator(addedCollab, portal) {
  const notificationExists = await isNotificationPresent(addedCollab);

  if (notificationExists) return;

  await updateCollaboratorInviteNotifications(addedCollab);

  const collaborators = getPortalDetails(portal).collaborators;
  const notification = buildNotificationObject(addedCollab, collaborators);
  
  const portalDetails = await getPortalMetadata({
    portal,
    portalMetadataIPFSHash: addedCollab.portalMetadataIPFSHash,
  });

  notification.message = constructNotificationMessage(addedCollab, portalDetails);
  await notification.save();
}

async function isNotificationPresent(addedCollab) {
  return await Notification.findOne({
    portalAddress: addedCollab.portalAddress,
    blockNumber: addedCollab.blockNumber,
    type: 'collaboratorJoin',
  });
}

async function updateCollaboratorInviteNotifications(addedCollab) {
  await Notification.updateMany({
    portalAddress: addedCollab.portalAddress,
    forAddress: addedCollab.account,
    type: 'collaboratorInvite',
  }, {
    $set: { action: false }
  });
}

function buildNotificationObject(addedCollab, collaborators) {
  return new Notification({
    portalAddress: addedCollab.portalAddress,
    audience: 'individuals',
    forAddress: collaborators,
    content: {
      transactionHash: addedCollab.transactionHash,
      account: addedCollab.account,
    },
    blockNumber: addedCollab.blockNumber,
    type: 'collaboratorJoin',
  });
}

function constructNotificationMessage(addedCollab, portalDetails) {
  if (portalDetails) {
    return `${addedCollab.account} joined the portal "${portalDetails.name}"`;
  } else {
    return `${addedCollab.account} joined the portal "${addedCollab.portalAddress}"`;
  }
}

agenda.define(jobs.ADDED_COLLABORATOR_JOB, async (job, done) => {
  try {
    const eventProcessed = await EventProcessor.findOne({});
    let addedCollabCheckpt = 0;
    if (eventProcessed) {
      addedCollabCheckpt = eventProcessed.addedCollaborator;
    }
    const eventName = 'registeredCollaboratorKeys';
    const addedCollabResult = await axios.post(apiURL, {
      query: `{
        ${eventName}(first: 5, orderDirection: asc, orderBy: blockNumber, where: { blockNumber_gt: ${addedCollabCheckpt} }) {
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

    let newAddedCollabCheckpt = null;
    if (addedCollabs && addedCollabs.length) {
      newAddedCollabCheckpt = addedCollabs.slice(-1)[0].blockNumber;
    }

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
          await createNotificationForAddCollaborator(addedCollab, portal);
        } else {
          await Portal.updateOne(
            {
              portalAddress: addedCollab.portalAddress,
              'collaborators.address': addedCollab.account,
            },
            {
              $set: {
                'collaborators.$.addedBlocknumber': addedCollab.blockNumber,
              },
            },
            { upsert: true },
          );
        }
      }),
    );
    if (newAddedCollabCheckpt) {
      await EventProcessor.updateOne(
        {},
        {
          $set: {
            addedCollaborator: newAddedCollabCheckpt,
          },
        },
        { upsert: true },
      );
    }
    done();
  } catch (err) {
    console.error(
      'Error in invited Collaborators',
      jobs.ADDED_COLLABORATOR_JOB,
      err,
    );
    done(err);
  } finally {
    console.log('Job done', jobs.ADDED_COLLABORATOR_JOB);
  }
});
