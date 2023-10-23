const config = require("../../../../config");
const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const STATUS_API_URL = config.SUBGRAPH_STATUS_API;
const EVENT_NAME = "removedCollaborators";
const BATCH_SIZE = 10;

agenda.define(jobs.REMOVED_COLLABORATOR, async (job, done) => {
  try {
    const latestBlockNumber = await getLatestBlockNumberFromSubgraph();
    const removedCollaboratorCheckpoint =
      await fetchRemovedCollaboratorCheckpoint();
    const batchSize = BATCH_SIZE;
    const removedCollaborators = await fetchRemovedCollaboratorEvents(
      removedCollaboratorCheckpoint,
      batchSize,
    );
    console.log(
      "Received entries",
      jobs.REMOVED_COLLABORATOR,
      removedCollaborators.length
    );
    await processRemovedCollaboratorEvents(removedCollaborators);
    const lastRemovedCollaboratorCheckpoint =
      getLastRemovedCollaboratorCheckpoint({ removedCollaborators, batchSize, latestBlockNumber });
    if (lastRemovedCollaboratorCheckpoint) {
      await updateRemovedCollaboratorCheckpoint(
        lastRemovedCollaboratorCheckpoint
      );
    }
    done();
  } catch (err) {
    console.error("Error in job", jobs.REMOVED_COLLABORATOR, err);
    done(err);
  } finally {
    console.log("Job done", jobs.REMOVED_COLLABORATOR);
  }
});

async function getLatestBlockNumberFromSubgraph() {
  const response = await axios.get(STATUS_API_URL);
  const statusObject = response?.data?.data['indexingStatusForCurrentVersion'] || {};
  const chains = statusObject.chains || [];
  const firstObject = chains.pop();
  return parseInt(firstObject?.latestBlock?.number, 10) || 0;
}

async function fetchRemovedCollaboratorCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.removedCollaborator : 0;
}

async function fetchRemovedCollaboratorEvents(checkpoint, itemCount) {
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: ${itemCount || 5}, orderDirection: asc, orderBy: blockNumber, where: { blockNumber_gte : ${checkpoint} }) {
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
