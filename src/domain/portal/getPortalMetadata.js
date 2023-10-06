const axios = require('axios');
const { Portal } = require('../../infra/database/models');

async function getPortalMetadata({ portal, portalMetadataIPFSHash }) {
  if (portal && portal.name && portal.logo) {
    return {
      name: portal.name,
      logo: portal.logo,
    };
  }
  try {
    const result = await Promise.any([
      axios.get('https://w3s.link/ipfs/' + portalMetadataIPFSHash),
      axios.get('https://ipfs.io/ipfs/' + portalMetadataIPFSHash),
      axios.get('https://dweb.link/ipfs/' + portalMetadataIPFSHash),
    ]);
    const metadata = result?.data;

    if (metadata.name) {
      await Portal.updateOne(
        { portalAddress: portal.portalAddress },
        {
          $set: {
            name: metadata.name,
            logo: metadata.logo,
            portalMetadataIPFSHash,
          },
        },
      );
    }
    return {
      name: metadata?.name,
      logo: metadata?.logo,
    };
  } catch (err) {
    console.error('Error during getting portal details', err);
    return null;
  }
}

module.exports = getPortalMetadata;
