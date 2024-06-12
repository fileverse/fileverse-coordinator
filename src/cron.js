const agenda = require('./interface/cron');
const jobs = require('./interface/cron/jobs');
const Reporter = require('./domain/reporter');

async function graceful() {
  await agenda.stop();
  // eslint-disable-next-line no-process-exit
  process.exit(0);
}

(async function () {
  try {
    await agenda.start();
    require('./interface/cron/events/addedFiles');
    require('./interface/cron/events/editedFiles');
    require('./interface/cron/events/addedCollaborator');
    require('./interface/cron/events/registeredCollaboratorKey');
    require('./interface/cron/events/removedCollaborator');
    require('./interface/cron/events/updatedPortalMetadata');
    require('./interface/cron/events/mint');
    require('./interface/cron/events/process');
    require('./interface/cron/events/publicPortalIndex');

    await agenda.every('20 seconds', jobs.ADDED_FILE);
    await agenda.every('20 seconds', jobs.EDITED_FILE);
    await agenda.every('20 seconds', jobs.ADDED_COLLABORATOR);
    await agenda.every('20 seconds', jobs.REGISTERED_COLLABORATOR_KEY);
    await agenda.every('20 seconds', jobs.REMOVED_COLLABORATOR);
    await agenda.every('20 seconds', jobs.UPDATED_PORTAL_METADATA);
    await agenda.every('20 seconds', jobs.MINT);
    await agenda.every('10 seconds', jobs.PROCESS);
    await agenda.every('10 seconds', jobs.PORTAL_INDEX);
  } catch (err) {
    await Reporter().alert(err.message, err.stack);
    console.log(err.stack);
    await graceful();
  }
})();

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);
