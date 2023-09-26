const jobs = require('../jobs');
const agenda = require('./../index');

const file = require('./../../../domain/notification/file');

agenda.define(jobs.EDITED_FILE_JOB, async (job, done) => {
  try {
    await file.editFile();
    done();
  } catch (err) {
    console.error('error during job', jobs.EDITED_FILE_JOB, err);
    done(err);
  }
});
