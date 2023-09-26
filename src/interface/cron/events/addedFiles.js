const jobs = require('../jobs');
const agenda = require('./../index');

const file = require('./../../../domain/notification/file');

agenda.define(jobs.ADDED_FILE_JOB, async (job, done) => {
  try {
    await file.addFile();
    done();
  } catch (err) {
    console.error('error during job', jobs.ADDED_FILE_JOB, err);
    done(err);
  }
});
