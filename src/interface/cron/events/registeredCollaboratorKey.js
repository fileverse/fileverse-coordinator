const config = require("../../../../config");
const { EventProcessor } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const EVENT_NAME = "registeredCollaboratorKey";

agenda.define(jobs.REGISTERED_COLLABORATOR_KEY, async (job, done) => {
  try {
    const registeredCollaboratorKeyCheckpoint =
      await fetchRegisteredCollaboratorKeyCheckpoint();
    const registeredCollaboratorKey =
      await fetchRegisteredCollaboratorKeyEvents(
        registeredCollaboratorKeyCheckpoint
      );
    console.log(
      "Received entries",
      jobs.REGISTERED_COLLABORATOR_KEY,
      registeredCollaboratorKey.length
    );
    await processRegisteredCollaboratorKeyEvents(registeredCollaboratorKey);
    const lastRegisteredCollaboratorKeyCheckpoint =
      getLastRegisteredCollaboratorKeyCheckpoint(registeredCollaboratorKey);
    if (lastRegisteredCollaboratorKeyCheckpoint) {
      await updateRegisteredCollaboratorKeyCheckpoint(
        lastRegisteredCollaboratorKeyCheckpoint
      );
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

async function fetchRegisteredCollaboratorKeyEvents(checkpoint) {
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: 5, orderDirection: asc, orderBy: blockNumber, where: { blockNumber_gte : ${checkpoint} }) {\
          id,
          portalAddress,
          blockNumber,
          account,
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
    });
    await event.save();
    // send notification of someone new just joined portal to the portal collaborators
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

function getLastRegisteredCollaboratorKeyCheckpoint(registeredCollaboratorKey) {
  const lastElem = (registeredCollaboratorKey || []).pop();
  return lastElem ? lastElem.blockNumber : null;
}

function updateRegisteredCollaboratorKeyCheckpoint(newCheckpoint) {
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
