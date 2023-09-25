const PortalContract = require('../../../contract/portalContract');
const config = require('../../../config');
const axios = require('axios');

async function getPortalDetailsFromAddress(portalAddress) {
  const contract = new PortalContract(
    portalAddress,
    config.PORTAL_REGISTRY_NETWORK,
  );
  const metadataIPFSHash = await contract.getMetadataIPFSHash();
  const result = await axios.get('https://ipfs.io/ipfs/' + metadataIPFSHash);
  const metadata = result?.data;
  return {
    name: metadata.name,
    logo: metadata.logo,
  };
}

module.exports = getPortalDetailsFromAddress;
