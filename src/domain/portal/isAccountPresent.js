function isAccountPresent(collaborators, account) {
  let foundCollaborator = null;
  collaborators.forEach((collaborator) => {
    const isSame = collaborator.address === account;
    if (isSame) {
      foundCollaborator = collaborator;
      return collaborator;
    }
  });
  return foundCollaborator;
}

module.exports = isAccountPresent;
