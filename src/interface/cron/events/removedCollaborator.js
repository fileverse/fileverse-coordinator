const config = require("../../../../config");
const constants = require("../../../constants");
const { EventProcessor, Event } = require("../../../infra/database/models");
const fetchAddedEventsID = require("./fetchedEvents");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const STATUS_API_URL = config.SUBGRAPH_STATUS_API;
const EVENT_NAME = "removedCollaborators";
const BATCH_SIZE = constants.CRON.BATCH_SIZE;

agenda.define(jobs.REMOVED_COLLABORATOR, async (job, done) => {
  let removedCollaborators = [];
  try {
    const removedCollaboratorCheckpoint =
      await fetchRemovedCollaboratorCheckpoint();
    const batchSize = BATCH_SIZE;
    removedCollaborators = await fetchRemovedCollaboratorEvents(
      removedCollaboratorCheckpoint,
      batchSize,
    );
    console.log(
      "Received entries",
      jobs.REMOVED_COLLABORATOR,
      removedCollaborators.length
    );
    await processRemovedCollaboratorEvents(removedCollaborators);

    done();
  } catch (err) {
    console.error("Error in job", jobs.REMOVED_COLLABORATOR, err);
    done(err);
  } finally {
    if (removedCollaborators.length > 0) {
      await updateRemovedCollaboratorCheckpoint(
        removedCollaborators[removedCollaborators.length - 1].blockNumber
      );
    }
    console.log("Job done", jobs.REMOVED_COLLABORATOR);
  }
});

async function fetchRemovedCollaboratorCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.removedCollaborator : 0;
}

async function fetchRemovedCollaboratorEvents(checkpoint, itemCount) {
  const fetchedEvents = await fetchAddedEventsID(EVENT_NAME);
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: ${itemCount || 5}, orderDirection: asc, orderBy: blockNumber, 
        where: {
          blockNumber_gte : ${checkpoint},
          id_not_in:[${fetchedEvents.map(event => `"${event}"`).join(', ')}]
        }) {
          id
          portalAddress,
          by,
          blockNumber,
          blockTimestamp,
          account,
        }
      }`,
  });
  return response?.data?.data[EVENT_NAME] || [];
}

async function processRemovedCollaboratorEvent(removedCollaborator) {
  try {
    const event = new Event({
      eventName: EVENT_NAME,
      data: removedCollaborator,
      uuid: removedCollaborator.id,
      portalAddress: removedCollaborator.portalAddress,
      blockNumber: removedCollaborator.blockNumber,
      jobName: jobs.REMOVED_COLLABORATOR,
      blockTimestamp: removedCollaborator.blockTimestamp,
    });
    await event.save();
  } catch (err) {
    console.log(err);
  }
}

async function processRemovedCollaboratorEvents(removedCollaborators) {
  const allPromises = removedCollaborators.map(async (removedCollaborator) => {
    await processRemovedCollaboratorEvent(removedCollaborator);
  });
  const data = await Promise.all(allPromises);
  return data;
}

function getLastRemovedCollaboratorCheckpoint({ removedCollaborators, batchSize, latestBlockNumber }) {
  if (removedCollaborators.length < batchSize) {
    return latestBlockNumber;
  }
  const lastElem = (removedCollaborators || []).pop();
  return lastElem ? lastElem.blockNumber : null;
}

function updateRemovedCollaboratorCheckpoint(newCheckpoint) {
  if (!newCheckpoint || newCheckpoint < 0) return;
  return EventProcessor.updateOne(
    {},
    {
      $set: {
        removedCollaborator: newCheckpoint,
      },
    },
    { upsert: true }
  );
}
