const axios = require('axios');
const getPortalDetails = require('../../portal/getPortalDetails');

async function getFileDetails({ portal, fileTypeNumber, metadataIPFSHash }) {
  const { collaborators, members, membersAndCollabs } =
    getPortalDetails(portal);

  let audience = '';
  let forAddress = [];
  let fileType = '';
  switch (fileTypeNumber) {
    case '0': {
      // Public
      audience = 'public';
      fileType = 'public';
      forAddress = membersAndCollabs;
      break;
    }
    case '1': {
      // private, collaborators only
      audience = 'collaborators_only';
      fileType = 'private';
      forAddress = collaborators;
      break;
    }
    case '2': {
      // gated
      audience = 'individuals';
      fileType = 'gated';
      forAddress = membersAndCollabs;
      break;
    }
    case '3': {
      // members
      audience = 'members_only';
      fileType = 'members only';
      forAddress = members;
      break;
    }
    default: {
      // FileType not valid
      return;
    }
  }
  if (!metadataIPFSHash) {
    return {
      audience,
      forAddress,
      fileType,
      metadata: null,
    };
  }
  let metadata = null;
  try {
    const result = await Promise.any([
      axios.get('https://w3s.link/ipfs/' + metadataIPFSHash),
      axios.get('https://ipfs.io/ipfs/' + metadataIPFSHash),
      axios.get('https://dweb.link/ipfs/' + metadataIPFSHash),
    ]);
    metadata = result?.data;
  } catch (err) {
    console.error('Error during getting file details', err);
  }
  return {
    audience,
    forAddress,
    fileType,
    metadata: {
      name: metadata?.name,
      mimeType: metadata?.mimeType,
      owner: metadata?.owner,
    },
  };
}

module.exports = getFileDetails;
