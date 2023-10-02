const config = require('../../../../config');
const getPortalDetailsFromAddress = require('../../../domain/portal/getPortalDetails');
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

agenda.define(jobs.REMOVED_COLLABORATOR_JOB, async (job, done) => {
  try {
    const eventProcessed = await EventProcessor.findOne({});
    let removedCollabEventsProcessed = 0;
    if (eventProcessed) {
      removedCollabEventsProcessed = eventProcessed.removeCollaborator;
    }
    const eventName = 'removedCollaborators';
    const removedCollabData = await axios.post(apiURL, {
      query: `{
    ${eventName}(first: 10, skip: ${removedCollabEventsProcessed}, orderDirection: asc, orderBy: blockNumber) {
      portalAddress,
      by,
      blockNumber,
      account,
      portalMetadataIPFSHash
    }
  }`,
    });

    const data = removedCollabData?.data?.data;
    const removedCollabs = data[eventName];

    await Promise.all(
      removedCollabs.map(async (removedCollab) => {
        const portal = await Portal.findOne({
          portalAddress: removedCollab.portalAddress,
        });
        const alreadyRemovedCollab =
          portal &&
          isAccountPresent(portal.collaborators, removedCollab.account);

        if (!alreadyRemovedCollab.removedBlocknumber) {
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
            { upsert: true },
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
            { upsert: true },
          );
        }
        const portalDetails = await getPortalDetailsFromAddress(
          removedCollab.portalMetadataIPFSHash,
        );
        const notification = new Notification({
          portalAddress: removedCollab.portalAddress,
          audience: 'individuals',
          forAddress: [removedCollab.account],
          content: {
            by: removedCollab.by,
            account: removedCollab.account,
          },
          message: `You were removed from portal ${
            portalDetails ? portalDetails.name : removedCollab.portalAddress
          } by ${removedCollab.by}`,
          blockNumber: removedCollab.blockNumber,
          type: 'collaboratorRemove',
        });
        await notification.save();
      }),
    );

    await EventProcessor.updateOne(
      {},
      {
        $set: {
          removeCollaborator:
            removedCollabEventsProcessed + removedCollabs.length,
        },
      },
      { upsert: true },
    );
    done();
  } catch (err) {
    console.error('error during job', jobs.REMOVED_COLLABORATOR_JOB, error);
    done(err);
  }
});
