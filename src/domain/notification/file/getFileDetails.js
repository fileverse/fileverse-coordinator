async function getFileDetails(portal, fileType) {
  let membersAndCollabs = [];
  if (portal.members)
    membersAndCollabs = membersAndCollabs.concat(portal.members);
  if (portal.collaborators)
    membersAndCollabs = membersAndCollabs.concat(portal.members);
  let audience = '';
  let forAddress = [];
  switch (fileType) {
    case '0': {
      // Public
      audience = 'public';
      forAddress = membersAndCollabs;
      break;
    }
    case '1': {
      // private, collaborators only
      audience = 'collaborators_only';
      forAddress = portal.collaborators;
      break;
    }
    case '2': {
      // gated
      audience = 'individuals';
      forAddress = portal.membersAndCollabs;
      break;
    }
    case '3': {
      // members
      audience = 'members_only';
      forAddress = portal.members;
      break;
    }
    default: {
      // FileType not valid
      return;
    }
  }
  return {
    audience,
    forAddress,
  };
}

module.exports = getFileDetails;
