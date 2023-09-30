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
    // console.log(await agenda.jobs());
    // require('./interface/cron/events/addedCollaborators');
    // require('./interface/cron/events/addedFiles');
    // require('./interface/cron/events/addedMembers');
    // require('./interface/cron/events/editedFiles');
    // require('./interface/cron/events/invitedCollaborators');
    // require('./interface/cron/events/removedMembers');
    // require('./interface/cron/events/removedCollaborators');

    // await agenda.every('* * * * *', jobs.INVITED_COLLABORATOR_JOB);
    // await agenda.every('* * * * *', jobs.ADDED_COLLABORATOR_JOB);
    // await agenda.now(jobs.ADDED_COLLABORATOR_JOB);
    // await agenda.every('* * * * *', jobs.ADDED_FILE_JOB);
    // await agenda.now(jobs.EDITED_FILE_JOB);
    // Object.keys(jobs).map(async (job) => {
    //   await agenda.every('* * * * *', job);
    // });
  } catch (err) {
    console.log(err.stack);
    await graceful();
  }
})();

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);
