const constants = require("../../../constants");
const config = require("../../../../config");
const { EventProcessor, Event } = require("../../../infra/database/models");
const fetchAddedEventsID = require("./fetchedEvents");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const STATUS_API_URL = config.SUBGRAPH_STATUS_API;

const EVENT_NAME = "addedCollaborators";
const BATCH_SIZE = constants.CRON.BATCH_SIZE;

agenda.define(jobs.ADDED_COLLABORATOR, async (job, done) => {
  let addedCollaborators = [];
  try {
    const addedCollaboratorCheckpoint = await fetchAddedCollaboratorCheckpoint();
    const batchSize = BATCH_SIZE;
    addedCollaborators = await fetchAddedCollaboratorEvents(
      addedCollaboratorCheckpoint,
      batchSize,
    );
    console.log(
      "Received entries",
      jobs.ADDED_COLLABORATOR,
      addedCollaborators.length
    );
    await processAddedCollaboratorEvents(addedCollaborators);
    if (addedCollaborators.length > 0) {
      await updateAddedCollaboratorCheckpoint(addedCollaborators[addedCollaborators.length - 1].blockNumber);
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

async function fetchAddedCollaboratorEvents(checkpoint, itemCount) {
  const existingEventIds = await fetchAddedEventsID(EVENT_NAME);
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: ${itemCount || 5}, orderDirection: asc, orderBy: blockNumber, 
        where: {
          blockNumber_gte : ${checkpoint},
          id_not_in:[${existingEventIds.map(event => `"${event}"`).join(', ')}]

        }) {
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
      blockTimestamp: addedCollaborator.blockTimestamp,
    });
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

function getLastAddedCollaboratorCheckpoint({ addedCollaborators, batchSize, latestBlockNumber }) {
  if (addedCollaborators.length < batchSize) {
    return latestBlockNumber;
  }
  const lastElem = (addedCollaborators || []).pop();
  return lastElem ? lastElem.blockNumber : null;
}

function updateAddedCollaboratorCheckpoint(newCheckpoint) {
  if (!newCheckpoint || newCheckpoint < 0) return;
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
