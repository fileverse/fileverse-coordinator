const axios = require('axios');

async function getFileDetails({ portal, fileTypeNumber, metadataIPFSHash }) {
  let membersAndCollabs = [];
  if (portal.members)
    membersAndCollabs = membersAndCollabs.concat(portal.members);
  if (portal.collaborators)
    membersAndCollabs = membersAndCollabs.concat(portal.members);
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
      forAddress = portal.collaborators;
      break;
    }
    case '2': {
      // gated
      audience = 'individuals';
      fileType = 'gated';
      forAddress = portal.membersAndCollabs;
      break;
    }
    case '3': {
      // members
      audience = 'members_only';
      fileType = 'members only';
      forAddress = portal.members;
      break;
    }
    default: {
      // FileType not valid
      return;
    }
  }
  let metadata = null;
  try {
    const result = await axios.get('https://ipfs.io/ipfs/' + metadataIPFSHash);
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
