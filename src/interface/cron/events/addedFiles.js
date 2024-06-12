const Reporter = require('../../../domain/reporter');
const config = require("../../../../config");
const constants = require("../../../constants");
const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");
const EventUtil = require("./utils");

const API_URL = config.SUBGRAPH_API;
const EVENT_NAME = "addedFiles";
const BATCH_SIZE = constants.CRON.BATCH_SIZE;

agenda.define(jobs.ADDED_FILE, async (job, done) => {
  let addedFiles = [];
  try {
    const addedFilesCheckpoint = await fetchAddedFilesCheckpoint();
    const batchSize = BATCH_SIZE;
    addedFiles = await fetchAddedFilesEvents(
      addedFilesCheckpoint,
      batchSize
    );
    console.log("Received entries", jobs.ADDED_FILE, addedFiles.length);
    await processAddedFilesEvents(addedFiles);
    const lastEventCheckpont = await EventUtil.getLastEventCheckpoint(addedFiles);
    if (lastEventCheckpont) {
      await updateAddedFilesCheckpoint(lastEventCheckpont);
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

async function fetchAddedFilesCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.addedFiles : 0;
}

async function fetchAddedFilesEvents(checkpoint, itemCount) {
  const existingEventIds = await EventUtil.fetchAddedEventsID(EVENT_NAME);
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: ${itemCount || 5
      }, orderDirection: asc, orderBy: blockNumber, 
      where: {
        blockNumber_gte : ${checkpoint},
        id_not_in:[${existingEventIds.map(event => `"${event}"`).join(', ')}]
      }) {
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
