const agenda = require('./interface/cron');
const jobs = require('./interface/cron/jobs');

async function graceful() {
  await agenda.stop();
  // eslint-disable-next-line no-process-exit
  process.exit(0);
}

(async function () {
  try {
    let crons = [];

    await agenda.start();

    require('./interface/cron/events/addedCollaborators');
    require('./interface/cron/events/addedFiles');
    // require('./interface/cron/events/addedMembers');
    require('./interface/cron/events/editedFiles');
    require('./interface/cron/events/invitedCollaborators');
    // require('./interface/cron/events/removedMembers');
    require('./interface/cron/events/removedCollaborators');
    require('./interface/cron/events/editPortalData');

    await agenda.every('20 seconds', jobs.INVITED_COLLABORATOR_JOB);
    await agenda.every('20 seconds', jobs.ADDED_COLLABORATOR_JOB);
    await agenda.every('20 seconds', jobs.ADDED_FILE_JOB);
    await agenda.every('20 seconds', jobs.EDITED_FILE_JOB);
    await agenda.every('20 seconds', jobs.REMOVED_COLLABORATOR_JOB);
    await agenda.every('20 seconds', jobs.EDITED_PORTAL_DATA);
  } catch (err) {
    console.log(err.stack);
    await graceful();
  }
})();

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);
