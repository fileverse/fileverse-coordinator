const config = require("../../../../config");
const constants = require("../../../constants");
const { EventProcessor, Event } = require("../../../infra/database/models");
const EventUtil = require("./utils");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const EVENT_NAME = "registeredCollaboratorKeys";
const BATCH_SIZE = constants.CRON.BATCH_SIZE;

agenda.define(jobs.REGISTERED_COLLABORATOR_KEY, async (job, done) => {
  let registeredCollaboratorKey = [];
  try {
    const registeredCollaboratorKeyCheckpoint = await fetchRegisteredCollaboratorKeyCheckpoint();
    const batchSize = BATCH_SIZE;
    registeredCollaboratorKey =
      await fetchRegisteredCollaboratorKeyEvents(
        registeredCollaboratorKeyCheckpoint,
        batchSize,
      );
    console.log(
      "Received entries",
      jobs.REGISTERED_COLLABORATOR_KEY,
      registeredCollaboratorKey.length
    );
    await processRegisteredCollaboratorKeyEvents(registeredCollaboratorKey);
    const lastEventCheckpont = await EventUtil.getLastEventCheckpoint(registeredCollaboratorKey);
    if (lastEventCheckpont) {
      await updateAddedCollaboratorCheckpoint(lastEventCheckpont);
    }
    done();
  } catch (err) {
    console.error("Error in job", jobs.REGISTERED_COLLABORATOR_KEY, err);
    done(err);
  } finally {
    console.log("Job done", jobs.REGISTERED_COLLABORATOR_KEY);
  }
});

async function fetchRegisteredCollaboratorKeyCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.registeredCollaboratorKey : 0;
}

async function fetchRegisteredCollaboratorKeyEvents(checkpoint, itemCount) {
  const existingEventIds = await EventUtil.fetchAddedEventsID(EVENT_NAME);
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: ${itemCount || 5}, orderDirection: asc, orderBy: blockNumber,
        where: {
          blockNumber_gte : ${checkpoint},
          id_not_in:[${existingEventIds.map(event => `"${event}"`).join(', ')}]
        }) {\
          id,
          portalAddress,
          blockNumber,
          account,
          blockTimestamp,
        }
      }`,
  });
  return response?.data?.data[EVENT_NAME] || [];
}

async function processRegisteredCollaboratorKeyEvent(
  registeredCollaboratorKey
) {
  try {
    const event = new Event({
      eventName: EVENT_NAME,
      uuid: registeredCollaboratorKey.id,
      data: registeredCollaboratorKey,
      portalAddress: registeredCollaboratorKey.portalAddress,
      blockNumber: registeredCollaboratorKey.blockNumber,
      blockTimestamp: registeredCollaboratorKey.blockTimestamp,
      jobName: jobs.REGISTERED_COLLABORATOR_KEY,
    });
    await event.save();
  } catch (err) {
    console.log(err);
  }
}

async function processRegisteredCollaboratorKeyEvents(
  registeredCollaboratorKeys
) {
  const allPromises = registeredCollaboratorKeys.map(
    async (registeredCollaboratorKey) => {
      await processRegisteredCollaboratorKeyEvent(registeredCollaboratorKey);
    }
  );
  const data = await Promise.all(allPromises);
  return data;
}

function updateRegisteredCollaboratorKeyCheckpoint(newCheckpoint) {
  if (!newCheckpoint || newCheckpoint < 0) return;
  return EventProcessor.updateOne(
    {},
    {
      $set: {
        registeredCollaboratorKey: newCheckpoint,
      },
    },
    { upsert: true }
  );
}
