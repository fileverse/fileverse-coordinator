const config = require("../../../../config");
const constants = require("../../../constants");

const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");
const fetchAddedEventsID = require("./fetchedEvents");


const API_URL = config.SUBGRAPH_API;
const STATUS_API_URL = config.SUBGRAPH_STATUS_API;

const EVENT_NAME = "editedFiles";
const BATCH_SIZE = constants.CRON.BATCH_SIZE;


agenda.define(jobs.EDITED_FILE, async (job, done) => {
  let editedFiles = [];
  try {
    const editedFilesCheckpoint = await fetchEditedFilesCheckpoint();
    const batchSize = BATCH_SIZE;
    editedFiles = await fetchEditedFilesEvents(
      editedFilesCheckpoint,
      batchSize
    );
    console.log("Received entries", jobs.EDITED_FILE, editedFiles.length);
    await processEditedFilesEvents(editedFiles);
    if (editedFiles.length > 0) {
      await updateEditedFilesCheckpoint(editedFiles[editedFiles.length - 1].blockNumber);
    }
    done();
  } catch (err) {
    console.error("Error in job", jobs.EDITED_FILE, err);
    done(err);
  } finally {
    console.log("Job done", jobs.EDITED_FILE);
  }
});


async function fetchEditedFilesCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.editedFiles : 0;
}

async function fetchEditedFilesEvents(checkpoint, itemCount) {
  const existingEventIds = await fetchAddedEventsID(EVENT_NAME);
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: ${itemCount || 5
      }, orderDirection: asc, orderBy: blockNumber, where: { 
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
