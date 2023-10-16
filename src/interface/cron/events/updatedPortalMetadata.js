const config = require("../../../../config");
const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const EVENT_NAME = "updatedPortalDatas";

agenda.define(jobs.UPDATED_PORTAL_METADATA, async (job, done) => {
  try {
    const updatedPortalMetadataCheckpoint =
      await fetchUpdatedPortalMetadataCheckpoint();
    const updatedPortalMetadatas = await fetchUpdatedPortalMetadataEvents(
      updatedPortalMetadataCheckpoint
    );
    console.log(
      "Received entries",
      jobs.UPDATED_PORTAL_METADATA,
      updatedPortalMetadatas.length
    );
    await processUpdatedPortalMetadataEvents(updatedPortalMetadatas);
    const lastUpdatedPortalMetadataCheckpoint =
      getLastUpdatedPortalMetadataCheckpoint(updatedPortalMetadatas);
    if (lastUpdatedPortalMetadataCheckpoint) {
      await updateUpdatedPortalMetadataCheckpoint(
        lastUpdatedPortalMetadataCheckpoint
      );
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

async function fetchUpdatedPortalMetadataEvents(checkpoint) {
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: 5, orderDirection: asc, orderBy: blockNumber, where: { blockNumber_gte : ${checkpoint} }) {
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
    });
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

function getLastUpdatedPortalMetadataCheckpoint(updatedPortalMetadatas) {
  const lastElem = (updatedPortalMetadatas || []).pop();
  return lastElem ? lastElem.blockNumber : null;
}

function updateUpdatedPortalMetadataCheckpoint(newCheckpoint) {
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
