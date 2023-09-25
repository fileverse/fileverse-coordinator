const {
  Portal,
  EventProcessor,
  Notification,
} = require('../../infra/database/models');
const config = require('../../../config');
const axios = require('axios');
const getPortalDetailsFromAddress = require('./getPortalDetails');

const apiURL = config.SUBGRAPH_API;

function isMemberPresent(members, addedMember) {
  members.map((member) => {
    if ((member.addresss = addedMember.account)) {
      return member;
    }
  });
  return null;
}

async function getAddedMembers() {
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
      const alreadyAddedMember = isMemberPresent(portal.members, addedMember);
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

      const portalDetails = await getPortalDetailsFromAddress();

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

  return addedMembers;
}

async function getRemovedMembers() {
  const eventProcessed = await EventProcessor.findOne({});
  let removedMemberEventProcessed = 0;
  if (eventProcessed) {
    removedMemberEventProcessed = eventProcessed.removeMember;
  }
  const eventName = 'removedMembers';
  const removedMemberData = await axios.post(apiURL, {
    query: `{
      ${eventName}(first: 100, skip: ${removedMemberEventProcessed}, orderDirection: asc, orderBy: blockNumber) {
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
      const alreadyRemovedMember = isMemberPresent(
        portal.collaborators,
        removedMember,
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

  return removedMembers;
}

module.exports = {
  getAddedMembers,
  getRemovedMembers,
};
