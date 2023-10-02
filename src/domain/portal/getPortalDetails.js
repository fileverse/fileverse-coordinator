const axios = require('axios');

async function getPortalDetailsFromAddress(portalMetadataIPFSHash) {
  try {
    const result = await Promise.any([
      axios.get('https://w3s.link/ipfs/' + portalMetadataIPFSHash),
      axios.get('https://ipfs.io/ipfs/' + portalMetadataIPFSHash),
    ]);
    const metadata = result?.data;
    return {
      name: metadata?.name,
      logo: metadata?.logo,
    };
  } catch (err) {
    console.error('Error during getting portal details', err);
    return null;
  }
}

module.exports = getPortalDetailsFromAddress;
