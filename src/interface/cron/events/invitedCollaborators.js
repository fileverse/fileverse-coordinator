const config = require('../../../../config');
const getPortalDetailsFromAddress = require('../../../domain/portal/getPortalDetails');
const {
  EventProcessor,
  Notification,
} = require('../../../infra/database/models');
const agenda = require('./../index');
const jobs = require('./../jobs');
const axios = require('axios');

const apiURL = config.SUBGRAPH_API;

agenda.define(jobs.INVITED_COLLABORATOR_JOB, async (job, done) => {
  try {
    const eventProcessed = await EventProcessor.findOne({});
    let invitedCollabEventsProcessed = 0;
    if (eventProcessed) {
      invitedCollabEventsProcessed = eventProcessed.invitedCollaborator;
    }
    const eventName = 'addedCollaborators';
    const invitedCollabResult = await axios.post(apiURL, {
      query: `{
      ${eventName}(first: 10, skip: ${invitedCollabEventsProcessed}, orderDirection: asc, orderBy: blockNumber) {
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
        try {
          const portalDetails = await getPortalDetailsFromAddress(
            invitedCollab.portalAddress,
          );
          notif.message = `${invitedCollab.by} invited you to become a collaborator of the portal ${portalDetails.name}`;
          notif.content.portalLogo = portalDetails.logo;
        } catch (err) {
          console.error('err during getting portal details', err);
          notif.message = `${invitedCollab.by} invited you to become a collaborator of the portal ${invitedCollab.portalAddress}`;
        }
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
    done();
  } catch (err) {
    console.error(
      'Error in invited Collaborators',
      jobs.INVITED_COLLABORATOR_JOB,
      err,
    );
    done(err);
  }
});
