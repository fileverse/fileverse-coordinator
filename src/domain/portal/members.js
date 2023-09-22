const { Portal, BlockNumber } = require('../../infra/database/models');
const config = require('../../../config');
const axios = require('axios');

const apiURL = config.SUBGRAPH_API;

async function getAddedMembers() {
  const latestBlockNumber = await BlockTimestamp.findOne({});
  let portalBlockTs = 0;
  if (lastBlockTimestamp) portalBlockTs = lastBlockTimestamp.portalBlockTs;
  const eventName = 'registeredMembers';
  const addedMembersResult = await axios.post(apiURL, {
    query: `{
      ${eventName}(first: 1000, orderDirection: asc, orderBy: blockNumber, where: {blockNumber: ${portalBlockTs}} ) {
          account,
          portalAddress,
          blockTimestamp
        }
      }`,
  });

  const data = addedMembersResult?.data?.data;
  const addedMembers = data[eventName];
  addedMembers.forEach((element, index) => {
    addedMembers[index].type = 'add';
  });
  console.log({ addedMembers });
  return addedMembers;
}

async function getRemovedMembers(newLastBlockTs) {
  const eventName = 'removedMembers';
  const removedMembersData = await axios.post(apiURL, {
    query: `{
      ${eventName}(first: 1000, orderDirection: asc, orderBy: blockTimestamp, where {blockTimestamp_lte: ${newLastBlockTs}}) {
        portalAddress,
        blockTimestamp,
        account,
      }
    }`,
  });

  const data = removedMembersData?.data?.data;
  const removedMembers = data[eventName];
  removedMembers.forEach((element, index) => {
    removedMembers[index].type = 'remove';
  });
  return removedMembers;
}

module.exports = {
  getAddedMembers,
  getRemovedMembers,
};
