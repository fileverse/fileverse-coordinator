const Reporter = require('../../../domain/reporter');
const config = require("../../../../config");
const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const STATUS_API_URL = config.SUBGRAPH_STATUS_API;

const EVENT_NAME = "addedFiles";
const BATCH_SIZE = 10;

agenda.define(jobs.ADDED_FILE, async (job, done) => {
  try {
    const latestBlockNumber = await getLatestBlockNumberFromSubgraph();
    const addedFilesCheckpoint = await fetchAddedFilesCheckpoint();
    const batchSize = BATCH_SIZE;
    const addedFiles = await fetchAddedFilesEvents(
      addedFilesCheckpoint,
      batchSize
    );
    console.log("Received entries", jobs.ADDED_FILE, addedFiles.length);
    await processAddedFilesEvents(addedFiles);
    const lastAddedFilesCheckpoint = getLastAddedFilesCheckpoint({
      addedFiles,
      batchSize,
      latestBlockNumber,
    });
    if (lastAddedFilesCheckpoint) {
      await updateAddedFilesCheckpoint(lastAddedFilesCheckpoint);
    }
    done();
  } catch (err) {
    await Reporter().alert(jobs.ADDED_FILE + "::" + err.message, err.stack);
    console.error("Error in job", jobs.ADDED_FILE, err);
    done(err);
  } finally {
    console.log("Job done", jobs.ADDED_FILE);
  }
});

async function getLatestBlockNumberFromSubgraph() {
  const response = await axios.get(STATUS_API_URL);
  const statusObject =
    response?.data?.data["indexingStatusForCurrentVersion"] || {};
  const chains = statusObject.chains || [];
  const firstObject = chains.pop();
  return parseInt(firstObject?.latestBlock?.number, 10) || 0;
}

async function fetchAddedFilesCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.addedFiles : 0;
}

async function fetchAddedFilesEvents(checkpoint, itemCount) {
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: ${itemCount || 5
      }, orderDirection: asc, orderBy: blockNumber, where: { blockNumber_gte : ${checkpoint} }) {
        id,
        fileId,
        fileType,
        metadataIPFSHash,
        contentIPFSHash,
        gateIPFSHash,
        by,
        blockNumber,
        blockTimestamp,
        portalAddress  
      }
    }`,
  });
  return response?.data?.data[EVENT_NAME] || [];
}

async function processAddedFilesEvent(addedFile) {
  try {
    const event = new Event({
      eventName: EVENT_NAME,
      data: addedFile,
      uuid: addedFile.id,
      portalAddress: addedFile.portalAddress,
      blockNumber: addedFile.blockNumber,
      jobName: jobs.ADDED_FILE,
      blockTimestamp: addedFile.blockTimestamp,
    });
    await event.save();
  } catch (err) {
    console.log(err);
  }
}

async function processAddedFilesEvents(addedFiles) {
  const allPromises = addedFiles.map(async (addedFiles) => {
    await processAddedFilesEvent(addedFiles);
  });
  const data = await Promise.all(allPromises);
  return data;
}

function getLastAddedFilesCheckpoint({
  addedFiles,
  batchSize,
  latestBlockNumber,
}) {
  if (addedFiles.length < batchSize) {
    return latestBlockNumber;
  }
  const lastElem = (addedFiles || []).pop();
  return lastElem ? lastElem.blockNumber : null;
}

function updateAddedFilesCheckpoint(newCheckpoint) {
  if (!newCheckpoint || newCheckpoint < 0) return;
  return EventProcessor.updateOne(
    {},
    {
      $set: {
        addedFiles: newCheckpoint,
      },
    },
    { upsert: true }
  );
}
