const config = require('../../../../config');
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

agenda.define(jobs.REMOVED_COLLABORATOR_JOB, async (job, done) => {
  try {
    const eventProcessed = await EventProcessor.findOne({});
    let removedCollabCheckpt = 0;
    if (eventProcessed) {
      removedCollabCheckpt = eventProcessed.removeCollaborator;
    }
    const eventName = 'removedCollaborators';
    const removedCollabData = await axios.post(apiURL, {
      query: `{
    ${eventName}(first: 5, orderDirection: asc, orderBy: blockNumber, where: {blockNumber_gt: ${removedCollabCheckpt}}) {
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
    let newRemovedCollabCheckpt = null;
    if (removedCollabs && removedCollabs.length) {
      newRemovedCollabCheckpt = removedCollabs.slice(-1)[0].blockNumber;
    }

    console.log(
      'Recieved entries',
      jobs.REMOVED_COLLABORATOR_JOB,
      removedCollabs.length,
    );

    await Promise.all(
      removedCollabs.map(async (removedCollab) => {
        const portal = await Portal.findOne({
          portalAddress: removedCollab.portalAddress,
        });
        const alreadyRemovedCollab =
          portal &&
          isAccountPresent(portal.collaborators, removedCollab.account);

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
                'collaborators.$.removedBlocknumber': removedCollab.blocknumber,
              },
            },
            { upsert: true },
          );
        }
        const portalDetails = await getPortalMetadata({
          portal,
          portalMetadataIPFSHash: removedCollab.portalMetadataIPFSHash,
        });

        // Delete the collaboratorInvite and collaboratorJoin Notification
        await Notification.deleteMany({
          portalAddress: removedCollab.portalAddress,
          forAddress: removedCollab.account,
          $or: [{ type: 'collaboratorInvite' }, { type: 'collaboratorJoin' }],
        });

        const notification = new Notification({
          portalAddress: removedCollab.portalAddress,
          audience: 'individuals',
          forAddress: [removedCollab.account],
          content: {
            by: removedCollab.by,
            account: removedCollab.account,
            portalLogo: portalDetails?.logo,
          },
          message: `${removedCollab.account} were removed from portal ${
            portalDetails && portalDetails.name
              ? portalDetails.name
              : removedCollab.portalAddress
          } by ${removedCollab.by}`,
          blockNumber: removedCollab.blockNumber,
          type: 'collaboratorRemove',
        });
        await notification.save();
      }),
    );

    if (newRemovedCollabCheckpt) {
      await EventProcessor.updateOne(
        {},
        {
          $set: {
            removeCollaborator: newRemovedCollabCheckpt,
          },
        },
        { upsert: true },
      );
    }
    done();
  } catch (err) {
    console.error('error during job', jobs.REMOVED_COLLABORATOR_JOB, err);
    done(err);
  } finally {
    console.log('Done job', jobs.REMOVED_COLLABORATOR_JOB);
  }
});
