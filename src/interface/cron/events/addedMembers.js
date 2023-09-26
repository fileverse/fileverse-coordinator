const jobs = require('../jobs');
const agenda = require('./../index');

const portal = require('./../../../domain/portal');

agenda.define(jobs.ADDED_MEMBER_JOB, async (job, done) => {
  try {
    await portal.members.getAddedMembers();
    done();
  } catch (err) {
    console.error('error during job', jobs.ADDED_MEMBER_JOB, err);
    done(err);
  }
});
