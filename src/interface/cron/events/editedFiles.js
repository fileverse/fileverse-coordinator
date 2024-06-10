const Logger = require('../../../domain/logger');
const config = require("../../../../config");
const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const STATUS_API_URL = config.SUBGRAPH_STATUS_API;

const EVENT_NAME = "editedFiles";
const BATCH_SIZE = 10;

agenda.define(jobs.EDITED_FILE, async (job, done) => {
  try {
    const latestBlockNumber = await getLatestBlockNumberFromSubgraph();
    const editedFilesCheckpoint = await fetchEditedFilesCheckpoint();
    const batchSize = BATCH_SIZE;
    const editedFiles = await fetchEditedFilesEvents(
      editedFilesCheckpoint,
      batchSize
    );
    console.log("Received entries", jobs.EDITED_FILE, editedFiles.length);
    await processEditedFilesEvents(editedFiles);
    const lastEditedFilesCheckpoint = getLastEditedFilesCheckpoint({
      editedFiles,
      batchSize,
      latestBlockNumber,
    });
    if (lastEditedFilesCheckpoint) {
      await updateEditedFilesCheckpoint(lastEditedFilesCheckpoint);
    }
    done();
  } catch (err) {
    await Logger.alert(jobs.EDITED_FILE + "::" + err.message, err.stack);
    console.error("Error in job", jobs.EDITED_FILE, err);
    done(err);
  } finally {
    console.log("Job done", jobs.EDITED_FILE);
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

async function fetchEditedFilesCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.editedFiles : 0;
}

async function fetchEditedFilesEvents(checkpoint, itemCount) {
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

async function processEditedFilesEvent(addedFile) {
  try {
    const event = new Event({
      eventName: EVENT_NAME,
      data: addedFile,
      uuid: addedFile.id,
      portalAddress: addedFile.portalAddress,
      blockNumber: addedFile.blockNumber,
      jobName: jobs.EDITED_FILE,
      blockTimestamp: addedFile.blockTimestamp,
    });
    await event.save();
  } catch (err) {
    console.log(err);
  }
}

async function processEditedFilesEvents(editedFiles) {
  const allPromises = editedFiles.map(async (editedFiles) => {
    await processEditedFilesEvent(editedFiles);
  });
  const data = await Promise.all(allPromises);
  return data;
}

function getLastEditedFilesCheckpoint({
  editedFiles,
  batchSize,
  latestBlockNumber,
}) {
  if (editedFiles.length < batchSize) {
    return latestBlockNumber;
  }
  const lastElem = (editedFiles || []).pop();
  return lastElem ? lastElem.blockNumber : null;
}

function updateEditedFilesCheckpoint(newCheckpoint) {
  if (!newCheckpoint || newCheckpoint < 0) return;
  return EventProcessor.updateOne(
    {},
    {
      $set: {
        editedFiles: newCheckpoint,
      },
    },
    { upsert: true }
  );
}
