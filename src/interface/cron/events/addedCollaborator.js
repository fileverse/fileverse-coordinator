const Reporter = require('../../../domain/reporter');
const constants = require("../../../constants");
const config = require("../../../../config");
const { EventProcessor, Event } = require("../../../infra/database/models");
const EventUtil = require("./utils");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const EVENT_NAME = "addedCollaborators";
const BATCH_SIZE = constants.CRON.BATCH_SIZE;

agenda.define(jobs.ADDED_COLLABORATOR, async (job, done) => {
  try {
    const addedCollaboratorCheckpoint = await fetchAddedCollaboratorCheckpoint();
    const batchSize = BATCH_SIZE;
    const addedCollaborators = await fetchAddedCollaboratorEvents(
      addedCollaboratorCheckpoint,
      batchSize,
    );
    console.log(
      "Received entries",
      jobs.ADDED_COLLABORATOR,
      addedCollaborators.length
    );
    await processAddedCollaboratorEvents(addedCollaborators);
    const lastEventCheckpont = await EventUtil.getLastEventCheckpoint(addedCollaborators);
    if (lastEventCheckpont) {
      await updateAddedCollaboratorCheckpoint(lastEventCheckpont);
    }
    done();
  } catch (err) {
    await Reporter().alert(jobs.ADDED_COLLABORATOR + "::" + err.message, err.stack);
    console.error("Error in job", jobs.ADDED_COLLABORATOR, err.message);
    done(err);
  } finally {
    console.log("Job done", jobs.ADDED_COLLABORATOR);
  }
});

async function fetchAddedCollaboratorCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.addedCollaborator : 0;
}

async function fetchAddedCollaboratorEvents(checkpoint, itemCount) {
  const existingEventIds = await EventUtil.fetchAddedEventsID(EVENT_NAME);
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: ${itemCount || 5}, orderDirection: asc, orderBy: blockNumber, 
        where: {
          blockNumber_gte : ${checkpoint},
          id_not_in:[${existingEventIds.map(event => `"${event}"`).join(', ')}]

        }) {
          id,
          portalAddress,
          by,
          blockNumber,
          account,
          blockTimestamp,
        }
      }`,
  });
  return response?.data?.data[EVENT_NAME] || [];
}

async function processAddedCollaboratorEvent(addedCollaborator) {
  try {
    const event = new Event({
      eventName: EVENT_NAME,
      data: addedCollaborator,
      uuid: addedCollaborator.id,
      portalAddress: addedCollaborator.portalAddress,
      blockNumber: addedCollaborator.blockNumber,
      jobName: jobs.ADDED_COLLABORATOR,
      blockTimestamp: addedCollaborator.blockTimestamp,
    });
    await event.save();
  } catch (err) {
    console.log(err);
  }
}

async function processAddedCollaboratorEvents(addedCollaborators) {
  const allPromises = addedCollaborators.map(async (addedCollaborator) => {
    await processAddedCollaboratorEvent(addedCollaborator);
  });
  const data = await Promise.all(allPromises);
  return data;
}

function updateAddedCollaboratorCheckpoint(newCheckpoint) {
  if (!newCheckpoint || newCheckpoint < 0) return;
  return EventProcessor.updateOne(
    {},
    {
      $set: {
        addedCollaborator: newCheckpoint,
      },
    },
    { upsert: true }
  );
}
