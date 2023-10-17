const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const processEvent = require('./processEvent');

agenda.define(jobs.PROCESS, async (job, done) => {
  try {
    const minCheckpoint = await fetchMinCheckpoint();
    const events = await fetchEvents(minCheckpoint, 10);
    console.log("Received entries", jobs.PROCESS, events.length);
    await processStoredEvents(events);
    done();
  } catch (err) {
    console.error("Error in job", jobs.MINT, err);
    done(err);
  } finally {
    console.log("Job done", jobs.MINT);
  }
});

async function fetchMinCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return Math.min(
    eventProcessed.addedCollaborator,
    eventProcessed.removedCollaborator,
    eventProcessed.registeredCollaboratorKey,
    eventProcessed.updatedPortalMetadata,
    eventProcessed.mint
  );
}

async function fetchEvents(checkpoint, limit) {
  const events = await Event.find({
    blockNumber: { $gte: checkpoint },
    processed: false,
  }).limit(limit);
  return events;
}

async function processSingleEvent(event) {
  try {
    const event = await Event.findById(event._id);
    await processEvent(event);
    event.processed = true;
    event.save();
  } catch (err) {
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
