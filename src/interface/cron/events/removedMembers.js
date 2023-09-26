const jobs = require('../jobs');
const agenda = require('./../index');

const portal = require('./../../../domain/portal');

agenda.define(jobs.REMOVED_MEMBER_JOB, async (job, done) => {
  try {
    await portal.members.getRemovedMembers();
    done();
  } catch (err) {
    console.error('error during job', jobs.REMOVED_COLLABORATOR_JOB, err);
    done(err);
  }
});
