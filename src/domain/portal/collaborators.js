const {
  Portal,
  EventProcessor,
  Notification,
} = require('../../infra/database/models');
const config = require('../../../config');
const axios = require('axios');

const apiURL = config.SUBGRAPH_API;

function isCollaboratorPresent(collaborators, addedCollaborator) {
  collaborators.map((collaborator) => {
    if ((collaborator.addresss = addedCollaborator.account)) {
      return collaborator;
    }
  });
  return null;
}

async function getInvitedCollaborators() {
  const eventProcessed = await EventProcessor.findOne({});
  let invitedCollabEventsProcessed = 0;
  if (eventProcessed) {
    invitedCollabEventsProcessed = eventProcessed.invitedCollaborator;
  }
  const eventName = 'addedCollaborators';
  const invitedCollabResult = await axios.post(apiURL, {
    query: `{
      ${eventName}(first: 1000, skip: ${invitedCollabEventsProcessed}, orderDirection: asc, orderBy: blockNumber) {
          portalAddress,
          by,
          blockNumber,
          account,
        }
      }`,
  });

  const data = invitedCollabResult?.data?.data;
  const invitedCollabs = data[eventName];

  await Promise.all(
    invitedCollabs.map(async (invitedCollab) => {
      const notif = new Notification({
        portalAddress: invitedCollab.portalAddress,
        content: {
          by: invitedCollab.by,
        },
        blockNumber: invitedCollab.blockNumber,
        type: 'collaboratorInvite',
        audience: 'individuals',
        forAddress: [invitedCollab.account],
      });
      await notif.save();
    }),
  );

  await EventProcessor.updateOne(
    {},
    {
      $set: {
        invitedCollaborator:
          invitedCollabEventsProcessed + invitedCollabs.length,
      },
    },
    { upsert: true },
  );

  console.log('done all');
  return 'success';
}

async function getAddedCollaborators() {
  const eventProcessed = await EventProcessor.findOne({});
  let addedCollabEventsProcessed = 0;
  if (eventProcessed) {
    addedCollabEventsProcessed = eventProcessed.addedCollaborator;
  }
  const eventName = 'registerKeys';
  const addedCollabResult = await axios.post(apiURL, {
    query: `{
      ${eventName}(first: 100, skip: ${addedCollabEventsProcessed}, orderDirection: asc, orderBy: blockNumber) {
          portalAddress,
          by,
          blockNumber,
          account,
        }
      }`,
  });

  const data = addedCollabResult?.data?.data;
  const addedCollabs = data[eventName];

  addedCollabs.map(async (addedCollab) => {
    const portal = await Portal.findOne({
      portalAddress: addedCollab.portalAddress,
    });
    const alreadyAddedCollab = isCollaboratorPresent(
      portal.collaborators,
      addedCollab,
    );
    if (!alreadyAddedCollab) {
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
      );
    } else {
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
      );
    }

    const notification = new Notification({
      portalAddress: addedCollab.portalAddress,
      audience: 'individuals',
      forAddress: addedCollab.account,
      content: {
        by: addedCollab.by,
      },
      blockNumber: addedCollab.blockNumber,
      type: 'collaboratorJoined',
    });
    notification.save();
  });

  await EventProcessor.updateOne(
    {},
    {
      $set: {
        addedCollaborator: addedCollabEventsProcessed + addedCollabs.length,
      },
    },
  );

  return addedCollabs;
}

async function getRemovedCollaborators() {
  const eventProcessed = await EventProcessor.findOne({});
  let removedCollabEventsProcessed = 0;
  if (eventProcessed) {
    removedCollabEventsProcessed = eventProcessed.removeCollaborator;
  }
  const eventName = 'removedCollaborators';
  const removedCollabData = await axios.post(apiURL, {
    query: `{
      ${eventName}(first: 100, skip: ${removedCollabEventsProcessed}, orderDirection: asc, orderBy: blockNumber) {
        portalAddress,
        by,
        blockNumber,
        account,
      }
    }`,
  });

  const data = removedCollabData?.data?.data;
  const removedCollabs = data[eventName];

  removedCollabs.map(async (removedCollab) => {
    const portal = await Portal.findOne({
      portalAddress: removedCollab.portalAddress,
    });
    const alreadyRemovedCollab = isCollaboratorPresent(
      portal.collaborators,
      removedCollab,
    );
    if (!alreadyRemovedCollab) {
      await Portal.updateOne(
        { portalAddress: removedCollab.portalAddress },
        {
          $push: {
            collaborators: {
              address: removedCollab.account,
              removedBlocknumber: removedCollab.blockNumber,
            },
          },
        },
      );
    } else {
      await Portal.updateOne(
        {
          portalAddress: removedCollab.portalAddress,
          'collaborators.address': removedCollab.account,
        },
        {
          $set: {
            'collaborators.removedBlocknumber': removedCollab.blocknumber,
          },
        },
      );
    }

    const notification = new Notification({
      portalAddress: removedCollab.portalAddress,
      audience: 'individuals',
      forAddress: removedCollab.account,
      content: {
        by: removedCollab.by,
      },
      blockNumber: removedCollab.blockNumber,
      type: 'collaboratorRemoved',
    });
    notification.save();
  });

  await EventProcessor.updateOne(
    {},
    {
      $set: {
        removeCollaborator:
          removedCollabEventsProcessed + removedCollabs.length,
      },
    },
  );

  return removedCollabs;
}

module.exports = {
  getAddedCollaborators,
  getInvitedCollaborators,
  getRemovedCollaborators,
};
