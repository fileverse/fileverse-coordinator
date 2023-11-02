const getPortal = require("./getPortal");
const { Portal } = require("../../infra/database/models");

async function updatePortal({ portalAddress, ipfsHash, metadata }) {
  const foundPortal = await getPortal({ portalAddress });
  await Portal.findByIdAndUpdate(foundPortal._id, {
    $set: {
      ipfsHash: ipfsHash || foundPortal.ipfsHash,
      name: (metadata && metadata.name) || foundPortal.name,
      description:
        (metadata && metadata.description) || foundPortal.description,
      logo: (metadata && metadata.logo) || foundPortal.logo,
      cover: (metadata && metadata.cover) || foundPortal.cover,
    },
  });
  return true;
}

module.exports = updatePortal;
