const config = require("../../../../config");
const getPortalMetadata = require("../../../domain/portal/getPortalMetadata");
const {
  EventProcessor,
  Notification,
} = require("../../../infra/database/models");
const agenda = require("./../index");
const jobs = require("./../jobs");
const axios = require("axios");

const apiURL = config.SUBGRAPH_API;

async function fetchInvitedCollaborators(invitedCollabCheckpt) {
  const eventName = "addedCollaborators";
  const response = await axios.post(apiURL, {
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
  return response?.data?.data[eventName];
}

async function createNotificationForInvitedCollaborator(invitedCollab) {
  const joinedOrAlreadyNotified = await Notification.findOne({
    portalAddress: invitedCollab.portalAddress,
    forAddress: invitedCollab.account,
    $or: [{ type: "collaboratorInvite" }, { type: "collaboratorJoin" }],
    blockNumber: { $lt: invitedCollab.blockNumber },
  });

  if (joinedOrAlreadyNotified) return;

  const notif = new Notification({
    portalAddress: invitedCollab.portalAddress,
    content: {
      by: invitedCollab.by,
    },
    blockNumber: invitedCollab.blockNumber,
    type: "collaboratorInvite",
    audience: "individuals",
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
}

async function updateEventProcessorCheckpoint(newCheckpoint) {
  if (newCheckpoint) {
    await EventProcessor.updateOne(
      {},
      {
        $set: {
          invitedCollaborator: newCheckpoint,
        },
      },
      { upsert: true }
    );
  }
}

agenda.define(jobs.INVITED_COLLABORATOR_JOB, async (job, done) => {
  try {
    const eventProcessed = await EventProcessor.findOne({});
    const invitedCollabCheckpt = eventProcessed
      ? eventProcessed.invitedCollaborator
      : 0;

    const invitedCollabs = await fetchInvitedCollaborators(
      invitedCollabCheckpt
    );
    const newInvitedCollabCheckpt =
      invitedCollabs && invitedCollabs.length
        ? invitedCollabs.slice(-1)[0].blockNumber
        : null;

    console.log(
      "Received entries",
      jobs.INVITED_COLLABORATOR_JOB,
      invitedCollabs.length
    );

    await Promise.all(
      invitedCollabs.map(createNotificationForInvitedCollaborator)
    );

    await updateEventProcessorCheckpoint(newInvitedCollabCheckpt);

    done();
  } catch (err) {
    console.error(
      "Error in invited Collaborators",
      jobs.INVITED_COLLABORATOR_JOB,
      err
    );
    done(err);
  } finally {
    console.log("Job done", jobs.INVITED_COLLABORATOR_JOB);
  }
});
