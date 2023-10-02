const jobs = require('../jobs');
const agenda = require('./../index');

const {
  EventProcessor,
  Portal,
  Notification,
} = require('../../../infra/database/models');
const isAccountPresent = require('../../../domain/portal/isAccountPresent');
const config = require('../../../../config');

const apiURL = config.SUBGRAPH_API;

agenda.define(jobs.REMOVED_MEMBER_JOB, async (job, done) => {
  try {
    const eventProcessed = await EventProcessor.findOne({});
    let removedMemberEventProcessed = 0;
    if (eventProcessed) {
      removedMemberEventProcessed = eventProcessed.removeMember;
    }
    const eventName = 'removedMembers';
    const removedMemberData = await axios.post(apiURL, {
      query: `{
      ${eventName}(first: 10, skip: ${removedMemberEventProcessed}, orderDirection: asc, orderBy: blockNumber) {
        portalAddress,
        blockNumber,
        account,
      }
    }`,
    });

    const data = removedMemberData?.data?.data;
    const removedMembers = data[eventName];

    await Promise.all(
      removedMembers.map(async (removedMember) => {
        const portal = await Portal.findOne({
          portalAddress: removedMember.portalAddress,
        });
        const alreadyRemovedMember = isAccountPresent(
          portal.collaborators,
          removedMember.account,
        );
        if (!alreadyRemovedMember) {
          await Portal.updateOne(
            { portalAddress: removedMember.portalAddress },
            {
              $push: {
                members: {
                  address: removedMember.account,
                  removedBlocknumber: removedMember.blockNumber,
                },
              },
            },
            { upsert: true },
          );
        } else {
          await Portal.updateOne(
            {
              portalAddress: removedMember.portalAddress,
              'members.address': removedMember.account,
            },
            {
              $set: {
                'members.removedBlocknumber': removedMember.blocknumber,
              },
            },
            { upsert: true },
          );
        }

        const notification = new Notification({
          portalAddress: removedMember.portalAddress,
          audience: 'members_only',
          forAddress: portal.members,
          blockNumber: removedMember.blockNumber,
          type: 'memberRemove',
        });
        await notification.save();
      }),
    );

    await EventProcessor.updateOne(
      {},
      {
        $set: {
          removeMember: removedMemberEventProcessed + removedMembers.length,
        },
      },
      { upsert: true },
    );
    done();
  } catch (err) {
    console.error('error during job', jobs.REMOVED_COLLABORATOR_JOB, err);
    done(err);
  }
});
