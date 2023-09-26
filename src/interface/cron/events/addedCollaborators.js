const config = require('../../../../config');
const getPortalDetailsFromAddress = require('../../../domain/portal/getPortalDetails');
const isCollaboratorPresent = require('../../../domain/portal/isCollaboratorPresent');
const {
  EventProcessor,
  Notification,
  Portal,
} = require('../../../infra/database/models');
const agenda = require('./../index');
const jobs = require('./../jobs');
const axios = require('axios');

const apiURL = config.SUBGRAPH_API;

agenda.define(jobs.ADDED_COLLABORATOR_JOB, async (job, done) => {
  try {
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

    await Promise.all(
      addedCollabs.map(async (addedCollab) => {
        const portal = await Portal.findOne({
          portalAddress: addedCollab.portalAddress,
        });
        const alreadyAddedCollab =
          portal && isCollaboratorPresent(portal.collaborators, addedCollab);
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
            { upsert: true },
          );
          const portalDetails = await getPortalDetailsFromAddress(
            addedCollab.portalAddress,
          );
          const notification = new Notification({
            portalAddress: addedCollab.portalAddress,
            audience: 'individuals',
            forAddress: [addedCollab.account],
            content: {
              by: addedCollab.by,
              portalLogo: portalDetails.logo,
            },
            message: `${addedCollab.account} joined the portal ${portalDetails.name}`,
            blockNumber: addedCollab.blockNumber,
            type: 'collaboratorJoined',
          });
          await notification.save();
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
            { upsert: true },
          );
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
