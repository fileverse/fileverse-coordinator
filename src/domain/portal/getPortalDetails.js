const PortalContract = require('../../../contract/portalContract');
const config = require('../../../config');
const axios = require('axios');

async function getPortalDetailsFromAddress(portalMetadataIPFSHash) {
  const result = await axios.get(
    'https://ipfs.io/ipfs/' + portalMetadataIPFSHash,
  );
  const metadata = result?.data;
  return {
    name: metadata?.name,
    logo: metadata?.logo,
  };
}

module.exports = getPortalDetailsFromAddress;
