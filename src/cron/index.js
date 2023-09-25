const cron = require('node-cron');
const portal = require('./../domain/portal');
const fileNotif = require('./../domain/notification/file');

cron.schedule('*/1 * * * *', async () => {
  console.log('running every 1 minute');
  await portal.collaborators.getInvitedCollaborators();
  await portal.collaborators.getAddedCollaborators();
  await portal.collaborators.getRemovedCollaborators();

  await portal.members.getAddedMembers();
  await portal.members.getRemovedMembers();

  await fileNotif.addFile();
  await fileNotif.editFile();
});
