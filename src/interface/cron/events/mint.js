const config = require("../../../../config");
const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const STATUS_API_URL = config.SUBGRAPH_STATUS_API;
const EVENT_NAME = "mints";
const BATCH_SIZE = 10;

agenda.define(jobs.MINT, async (job, done) => {
  try {
    const latestBlockNumber = await getLatestBlockNumberFromSubgraph();
    const mintCheckpoint = await fetchMintCheckpoint();
    const batchSize = BATCH_SIZE;
    const mints = await fetchMintEvents(mintCheckpoint, batchSize);

    console.log("Received entries", jobs.MINT, mints.length);

    await processMintEvents(mints);

    const lastMintCheckpoint = getLastMintCheckpoint({ mints, batchSize, latestBlockNumber });
    if (lastMintCheckpoint) {
      await updateMintCheckpoint(lastMintCheckpoint);
    }
    done();
  } catch (err) {
    console.error("Error in job", jobs.MINT, err);
    done(err);
  } finally {
    console.log("Job done", jobs.MINT);
  }
});

async function getLatestBlockNumberFromSubgraph() {
  const response = await axios.get(STATUS_API_URL);
  const statusObject = response?.data?.data['indexingStatusForCurrentVersion'] || {};
  const chains = statusObject.chains || [];
  const firstObject = chains.pop();
  return parseInt(firstObject?.latestBlock?.number, 10) || 0;
}

async function fetchMintCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.mint : 0;
}

async function fetchMintEvents(checkpoint, itemCount) {
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: ${itemCount || 5}, orderDirection: asc, orderBy: blockNumber, where: { blockNumber_gte : ${checkpoint} }) {
          id,
          portal,
          account,
          blockNumber,
          blockTimestamp,
        }
      }`,
  });
  return response?.data?.data[EVENT_NAME] || [];
}

async function processMintEvent(mint) {
  try {
    const event = new Event({
      eventName: EVENT_NAME,
      uuid: mint.id,
      data: mint,
      portalAddress: mint.portal,
      blockNumber: mint.blockNumber,
      blockTimestamp: mint.blockTimestamp,
      jobName: jobs.MINT,
    });
    await event.save();
  } catch (err) {
    console.log(err);
  }
}

async function processMintEvents(mints) {
  const allPromises = mints.map(async (mint) => {
    await processMintEvent(mint);
  });
  const data = await Promise.all(allPromises);
  console.log(data);
  return data;
}

function getLastMintCheckpoint({ mints, batchSize, latestBlockNumber }) {
  if (mints.length < batchSize) {
    return latestBlockNumber;
  }
  const lastElem = (mints || []).pop();
  return lastElem ? lastElem.blockNumber : null;
}

function updateMintCheckpoint(newCheckpoint) {
  if (!newCheckpoint || newCheckpoint < 0) return;
  return EventProcessor.updateOne(
    {},
    {
      $set: {
        mint: newCheckpoint,
      },
    },
    { upsert: true }
  );
}
