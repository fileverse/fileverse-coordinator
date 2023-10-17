const axios = require('axios');
const { Portal } = require('../../infra/database/models');

const IPFS_BASE_URLS = [
  'https://w3s.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
];

async function getPortalMetadata({ portal, portalMetadataIPFSHash }) {
  if (portal && portal.name && portal.logo) {
    return {
      name: portal.name,
      logo: portal.logo,
    };
  }

  try {
    const metadata = await fetchMetadataFromIPFS(portalMetadataIPFSHash);

    if (metadata && metadata.name) {
      await updatePortalInDB(portal, metadata);
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

async function fetchMetadataFromIPFS(hash) {
  const fetchPromises = IPFS_BASE_URLS.map(url => axios.get(url + hash));
  
  const result = await Promise.any(fetchPromises);
  
  return result?.data;
}

async function updatePortalInDB(portal, metadata) {
  await Portal.updateOne(
    { portalAddress: portal.portalAddress },
    {
      $set: {
        name: metadata.name,
        logo: metadata.logo,
        portalMetadataIPFSHash: portal.portalMetadataIPFSHash,
      },
    },
  );
}

module.exports = getPortalMetadata;
