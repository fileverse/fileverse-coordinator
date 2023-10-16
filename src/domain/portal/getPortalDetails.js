function getPortalDetails(portal) {
  const members = extractActiveAddresses(portal?.members);
  const collaborators = extractActiveAddresses(portal?.collaborators);

  return {
    collaborators,
  };
}

function extractActiveAddresses(entities) {
  return (entities || [])
    .filter(
      (entity) =>
        entity.addedBlocknumber &&
        (entity.addedBlocknumber > (entity?.removedBlocknumber || 0))
    )
    .map((entity) => entity.address);
}

module.exports = getPortalDetails;
