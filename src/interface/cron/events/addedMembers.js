const jobs = require('../jobs');
const agenda = require('./../index');

const {
  EventProcessor,
  Portal,
  Notification,
} = require('../../../infra/database/models');
const isAccountPresent = require('../../../domain/portal/isAccountPresent');
const getPortalDetailsFromAddress = require('../../../domain/portal/getPortalDetails');
const config = require('../../../../config');

const apiURL = config.SUBGRAPH_API;

agenda.define(jobs.ADDED_MEMBER_JOB, async (job, done) => {
  try {
    const eventProcessed = await EventProcessor.findOne({});
    let addedMembersEventProcessed = 0;
    if (eventProcessed) {
      addedMembersEventProcessed = eventProcessed.addMember;
    }
    const eventName = 'registeredMembers';
    const addMembersResult = await axios.post(apiURL, {
      query: `{
      ${eventName}(first: 100, skip: ${addedMembersEventProcessed}, orderDirection: asc, orderBy: blockNumber) {
          portalAddress,
          blockNumber,
          account,
        }
      }`,
    });

    const data = addMembersResult?.data?.data;
    const addedMembers = data[eventName];

    await Promise.all(
      addedMembers.map(async (addedMember) => {
        const portal = await Portal.findOne({
          portalAddress: addedMember.portalAddress,
        });
        const alreadyAddedMember = isAccountPresent(
          portal.members,
          addedMember,
        );
        if (!alreadyAddedMember) {
          await Portal.updateOne(
            { portalAddress: addedMember.portalAddress },
            {
              $push: {
                members: {
                  address: addedMember.account,
                  addedBlocknumber: addedMember.blockNumber,
                },
              },
            },
            { upsert: true },
          );
        } else {
          await Portal.updateOne(
            {
              portalAddress: addedMember.portalAddress,
              'members.address': addedMember.account,
            },
            {
              $set: {
                'members.addedBlocknumber': addedMember.blockNumber,
              },
            },
            { upsert: true },
          );
        }

        const portalDetails = await getPortalDetailsFromAddress(
          portal.portalAddress,
        );

        const notification = new Notification({
          portalAddress: addedMember.portalAddress,
          forAddress: portal.members,
          audience: 'members_only',
          content: {
            portalLogo: portalDetails.logo,
          },
          blockNumber: addedMember.blockNumber,
          message: `${addedMember.account} has joined the portal ${portalDetails.name} as member.`,
          type: 'memberJoin',
        });
        await notification.save();
      }),
    );

    await EventProcessor.updateOne(
      {},
      {
        $set: {
          addMember: addedMembersEventProcessed + addedMembers.length,
        },
      },
      { upsert: true },
    );

    done();
  } catch (err) {
    console.error('error during job', jobs.ADDED_MEMBER_JOB, err);
    done(err);
  }
});
