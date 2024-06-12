const Reporter = require('../../../domain/reporter');
const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const processEvent = require('./processEvent');
const FetchEventCount = 10;
const { EVENT_PROCESS_MAX_RETRIES } = require("../../../constants");

agenda.define(jobs.PROCESS, async (job, done) => {
  try {
    const minCheckpoint = await fetchMinCheckpoint();
    const events = await fetchEvents(minCheckpoint, FetchEventCount);
    console.log("Received entries", jobs.PROCESS, events.length);
    await processStoredEvents(events);
    done();
  } catch (err) {
    await Reporter().alert(jobs.PROCESS + "::" + err.message, err.stack);
    console.error("Error in job", jobs.PROCESS, err);
    done(err);
  } finally {
    console.log("Job done", jobs.PROCESS);
  }
});

async function fetchMinCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return Math.min(
    eventProcessed.editedFiles,
    eventProcessed.addedFiles,
    eventProcessed.addedCollaborator,
    eventProcessed.removedCollaborator,
    eventProcessed.registeredCollaboratorKey,
  );
}

async function fetchEvents(checkpoint, limit) {
  const events = await Event.find({
    blockNumber: { $lte: checkpoint },
    processed: false,
    retries: { $lt: EVENT_PROCESS_MAX_RETRIES },
  }).limit(limit);
  return events;
}

async function processSingleEvent(event) {
  try {
    await processEvent(event);
    await Event.findByIdAndUpdate(event._id, {
      $set: { processed: true },
    })
  } catch (err) {
    await Event.findByIdAndUpdate(event._id, {
      $set: { retries: event.retries + 1 },
    })
    console.log(err);
  }
}

async function processStoredEvents(events) {
  const allPromises = events.map(async (event) => {
    await processSingleEvent(event);
  });
  const data = await Promise.all(allPromises);
  return data;
}
