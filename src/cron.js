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
    require('./interface/cron/events/contractEvents/process');
    require('./interface/cron/events/publicPortalIndex');
    require('./interface/cron/events/events');

    await agenda.every('20 seconds', jobs.CONTRACT_EVENTS);
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
