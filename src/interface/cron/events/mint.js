const config = require("../../../../config");
const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const EVENT_NAME = "mints";

agenda.define(jobs.MINT, async (job, done) => {
  try {
    const mintCheckpoint = await fetchMintCheckpoint();
    const mints = await fetchMintEvents(mintCheckpoint);

    console.log("Received entries", jobs.MINT, mints.length);

    await processMintEvents(mints);

    const lastMintCheckpoint = getLastMintCheckpoint(mints);
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

async function fetchMintCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.mint : 0;
}

async function fetchMintEvents(checkpoint) {
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: 5, orderDirection: asc, orderBy: blockNumber, where: { blockNumber_gte : ${checkpoint} }) {
          id,
          portal,
          account,
          blockNumber,
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

function getLastMintCheckpoint(mints) {
  const lastElem = (mints || []).pop();
  return lastElem ? lastElem.blockNumber : null;
}

function updateMintCheckpoint(newCheckpoint) {
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
