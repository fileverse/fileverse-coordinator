const config = require("../../../../config");
const constants = require("../../../constants");
const { EventProcessor, Event } = require("../../../infra/database/models");
const fetchAddedEventsID = require("./utils");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");
const processEvent = require('./processEvent');

const API_URL = config.SUBGRAPH_API;
const EVENT_NAME = "updatedPortalDatas";
const BATCH_SIZE = constants.CRON.BATCH_SIZE;

agenda.define(jobs.UPDATED_PORTAL_METADATA, async (job, done) => {
  let updatedPortalMetadatas = [];
  try {
    const updatedPortalMetadataCheckpoint =
      await fetchUpdatedPortalMetadataCheckpoint();
    const batchSize = BATCH_SIZE;
    updatedPortalMetadatas = await fetchUpdatedPortalMetadataEvents(
      updatedPortalMetadataCheckpoint,
      batchSize,
    );
    console.log(
      "Received entries",
      jobs.UPDATED_PORTAL_METADATA,
      updatedPortalMetadatas.length
    );
    await processUpdatedPortalMetadataEvents(updatedPortalMetadatas);
    const lastEventCheckpont = await EventUtil.getLastEventCheckpoint(updatedPortalMetadatas);
    if (lastEventCheckpont) {
      await updateAddedCollaboratorCheckpoint(lastEventCheckpont);
    }
    done();
  } catch (err) {
    console.error("Error in job", jobs.UPDATED_PORTAL_METADATA, err);
    done(err);
  } finally {
    console.log("Job done", jobs.UPDATED_PORTAL_METADATA);
  }
});

async function fetchUpdatedPortalMetadataCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.updatedPortalMetadata : 0;
}

async function fetchUpdatedPortalMetadataEvents(checkpoint, itemCount) {
  const existingEventIds = await fetchAddedEventsID(EVENT_NAME);
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: ${itemCount || 5}, orderDirection: asc, orderBy: blockNumber, 
        where: {
          blockNumber_gte : ${checkpoint},
          id_not_in:[${existingEventIds.map(event => `"${event}"`).join(', ')}]
        }) {
          id
          portalAddress,
          blockNumber,
          metadataIPFSHash,
          by,
        }
      }`,
  });
  return response?.data?.data[EVENT_NAME] || [];
}

async function processUpdatedPortalMetadataEvent(updatedPortalMetadata) {
  try {
    const event = new Event({
      eventName: EVENT_NAME,
      data: updatedPortalMetadata,
      uuid: updatedPortalMetadata.id,
      portalAddress: updatedPortalMetadata.portalAddress,
      blockNumber: updatedPortalMetadata.blockNumber,
      jobName: jobs.UPDATED_PORTAL_METADATA,
    });
    await event.save();
    await processEvent(event);
    event.processed = true;
    await event.save();
  } catch (err) {
    console.log(err);
  }
}

async function processUpdatedPortalMetadataEvents(updatedPortalMetadatas) {
  const allPromises = updatedPortalMetadatas.map(
    async (updatedPortalMetadata) => {
      await processUpdatedPortalMetadataEvent(updatedPortalMetadata);
    }
  );
  const data = await Promise.all(allPromises);
  return data;
}

function updateUpdatedPortalMetadataCheckpoint(newCheckpoint) {
  if (!newCheckpoint || newCheckpoint < 0) return;
  return EventProcessor.updateOne(
    {},
    {
      $set: {
        updatedPortalMetadata: newCheckpoint,
      },
    },
    { upsert: true }
  );
}
