const config = require("../../../../config");
const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const EVENT_NAME = "addedCollaborators";

agenda.define(jobs.ADDED_COLLABORATOR, async (job, done) => {
  try {
    const addedCollaboratorCheckpoint =
      await fetchAddedCollaboratorCheckpoint();
    const addedCollaborators = await fetchAddedCollaboratorEvents(
      addedCollaboratorCheckpoint
    );
    console.log(
      "Received entries",
      jobs.ADDED_COLLABORATOR,
      addedCollaborators.length
    );
    await processAddedCollaboratorEvents(addedCollaborators);
    const lastAddedCollaboratorCheckpoint =
      getLastAddedCollaboratorCheckpoint(addedCollaborators);
    if (lastAddedCollaboratorCheckpoint) {
      await updateAddedCollaboratorCheckpoint(lastAddedCollaboratorCheckpoint);
    }
    done();
  } catch (err) {
    console.error("Error in job", jobs.ADDED_COLLABORATOR, err);
    done(err);
  } finally {
    console.log("Job done", jobs.ADDED_COLLABORATOR);
  }
});

async function fetchAddedCollaboratorCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.addedCollaborator : 0;
}

async function fetchAddedCollaboratorEvents(checkpoint) {
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: 5, orderDirection: asc, orderBy: blockNumber, where: { blockNumber_gte : ${checkpoint} }) {
          id,
          portalAddress,
          by,
          blockNumber,
          account,
          blockTimestamp,
        }
      }`,
  });
  return response?.data?.data[EVENT_NAME] || [];
}

async function processAddedCollaboratorEvent(addedCollaborator) {
  try {
    const event = new Event({
      eventName: EVENT_NAME,
      data: addedCollaborator,
      uuid: addedCollaborator.id,
      portalAddress: addedCollaborator.portalAddress,
      blockNumber: addedCollaborator.blockNumber,
      jobName: jobs.ADDED_COLLABORATOR,
    });
    await event.save();
    await processEvent(event);
    event.processed = true;
    await event.save();
  } catch (err) {
    console.log(err);
  }
}

async function processAddedCollaboratorEvents(addedCollaborators) {
  const allPromises = addedCollaborators.map(async (addedCollaborator) => {
    await processAddedCollaboratorEvent(addedCollaborator);
  });
  const data = await Promise.all(allPromises);
  return data;
}

function getLastAddedCollaboratorCheckpoint(addedCollaborators) {
  const lastElem = (addedCollaborators || []).pop();
  return lastElem ? lastElem.blockNumber : null;
}

function updateAddedCollaboratorCheckpoint(newCheckpoint) {
  return EventProcessor.updateOne(
    {},
    {
      $set: {
        addedCollaborator: newCheckpoint,
      },
    },
    { upsert: true }
  );
}
