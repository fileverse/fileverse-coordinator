const config = require('../../../../config');
const getPortalMetadata = require('../../../domain/portal/getPortalMetadata');
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
    let invitedCollabCheckpt = 0;
    if (eventProcessed) {
      invitedCollabCheckpt = eventProcessed.invitedCollaborator;
    }
    const eventName = 'addedCollaborators';
    const invitedCollabResult = await axios.post(apiURL, {
      query: `{
      ${eventName}(first: 5, orderDirection: asc, orderBy: blockNumber, where: {blockNumber_gt : ${invitedCollabCheckpt}}) {
          portalAddress,
          by,
          blockNumber,
          account,
          portalMetadataIPFSHash
        }
      }`,
    });

    const data = invitedCollabResult?.data?.data;
    const invitedCollabs = data[eventName];

    let newInvitedCollabCheckpt = null;
    if (invitedCollabs && invitedCollabs.length) {
      newInvitedCollabCheckpt = invitedCollabs.slice(-1)[0].blockNumber;
    }

    console.log(
      'Recieved entries',
      jobs.INVITED_COLLABORATOR_JOB,
      invitedCollabs.length,
    );

    await Promise.all(
      invitedCollabs.map(async (invitedCollab) => {
        const joinedOrAlreadyNotified = await Notification.findOne({
          portalAddress: invitedCollab.portalAddress,
          forAddress: invitedCollab.account,
          $or: [{ type: 'collaboratorInvite' }, { type: 'collaboratorJoin' }],
          blockNumber: { $lt: invitedCollab.blockNumber },
        });

        if (joinedOrAlreadyNotified) return;

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
        const portalDetails = await getPortalMetadata({
          portal: {
            portalAddress: invitedCollab.portalAddress,
          },
          portalMetadataIPFSHash: invitedCollab.portalMetadataIPFSHash,
        });
        if (portalDetails) {
          notif.message = `${invitedCollab.by} invited you to become a collaborator of the portal "${portalDetails.name}"`;
          notif.content.portalLogo = portalDetails.logo;
          notif.content.portalName = portalDetails.name;
        } else {
          notif.message = `${invitedCollab.by} invited you to become a collaborator of the portal "${invitedCollab.portalAddress}"`;
        }
        await notif.save();
      }),
    );

    if (newInvitedCollabCheckpt) {
      await EventProcessor.updateOne(
        {},
        {
          $set: {
            invitedCollaborator: newInvitedCollabCheckpt,
          },
        },
        { upsert: true },
      );
    }
    done();
  } catch (err) {
    console.error(
      'Error in invited Collaborators',
      jobs.INVITED_COLLABORATOR_JOB,
      err,
    );
    done(err);
  } finally {
    console.log('Job done', jobs.INVITED_COLLABORATOR_JOB);
  }
});
