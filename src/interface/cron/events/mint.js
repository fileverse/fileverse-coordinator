const config = require("../../../../config");
const constants = require("../../../constants");

const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");
const EventUtil = require("./utils");

const API_URL = config.SUBGRAPH_API;
const EVENT_NAME = "mints";
const BATCH_SIZE = constants.CRON.BATCH_SIZE;

agenda.define(jobs.MINT, async (job, done) => {
  let mints = [];
  try {
    const mintCheckpoint = await fetchMintCheckpoint();
    const batchSize = BATCH_SIZE;
    mints = await fetchMintEvents(mintCheckpoint, batchSize);
    console.log("Received entries", jobs.MINT, mints.length);
    await processMintEvents(mints);
    const lastEventCheckpont = await EventUtil.getLastEventCheckpoint(mints);
    if (lastEventCheckpont) {
      await updateAddedCollaboratorCheckpoint(lastEventCheckpont);
    }
    done();
  } catch (err) {
    console.error("Error in job", jobs.MINT, err);
    done(err);
  } finally {
    console.log("Job done", jobs.MINT);
  }
});

async function fetchMintCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.mint : 0;
}

async function fetchMintEvents(checkpoint, itemCount) {
  const existingEventIds = await EventUtil.fetchAddedEventsID(EVENT_NAME);
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: ${itemCount || 5}, orderDirection: asc, orderBy: blockNumber, 
        where: {
          blockNumber_gte : ${checkpoint},
          id_not_in:[${existingEventIds.map(event => `"${event}"`).join(', ')}]
         }) {
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
  return data;
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
