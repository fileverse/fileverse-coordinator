function getPortalDetails(portal) {
  let collaborators = [];
  let members = [];

  if (portal?.members) {
    portal.members.map((member) => {
      if (
        member.addedBlocknumber &&
        member.addedBlocknumber > (member?.removedBlocknumber || 0)
      ) {
        members.push(member.address);
      }
    });
  }
  if (portal?.collaborators) {
    portal.collaborators.map((collaborator) => {
      if (
        collaborator.addedBlocknumber &&
        collaborator.addedBlocknumber > (collaborator?.removedBlocknumber || 0)
      ) {
        collaborators.push(collaborator.address);
      }
    });
  }

  let membersAndCollabs = collaborators.concat(members);
  return {
    collaborators,
    members,
    membersAndCollabs,
  };
}

module.exports = getPortalDetails;
