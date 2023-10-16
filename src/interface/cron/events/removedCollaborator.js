const config = require("../../../../config");
const { EventProcessor, Event } = require("../../../infra/database/models");
const agenda = require("../index");
const jobs = require("../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const EVENT_NAME = "removedCollaborators";

agenda.define(jobs.REMOVED_COLLABORATOR, async (job, done) => {
  try {
    const removedCollaboratorCheckpoint =
      await fetchRemovedCollaboratorCheckpoint();
    const removedCollaborators = await fetchRemovedCollaboratorEvents(
      removedCollaboratorCheckpoint
    );
    console.log(
      "Received entries",
      jobs.REMOVED_COLLABORATOR,
      removedCollaborators.length
    );
    await processRemovedCollaboratorEvents(removedCollaborators);
    const lastRemovedCollaboratorCheckpoint =
      getLastRemovedCollaboratorCheckpoint(removedCollaborators);
    if (lastRemovedCollaboratorCheckpoint) {
      await updateRemovedCollaboratorCheckpoint(
        lastRemovedCollaboratorCheckpoint
      );
    }
    done();
  } catch (err) {
    console.error("Error in job", jobs.REMOVED_COLLABORATOR, err);
    done(err);
  } finally {
    console.log("Job done", jobs.REMOVED_COLLABORATOR);
  }
});

async function fetchRemovedCollaboratorCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.removedCollaborator : 0;
}

async function fetchRemovedCollaboratorEvents(checkpoint) {
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: 5, orderDirection: asc, orderBy: blockNumber, where: { blockNumber_gte : ${checkpoint} }) {
          id
          portalAddress,
          by,
          blockNumber,
          account,
        }
      }`,
  });
  return response?.data?.data[EVENT_NAME] || [];
}

async function processRemovedCollaboratorEvent(removedCollaborator) {
  try {
    const event = new Event({
      eventName: EVENT_NAME,
      data: removedCollaborator,
      uuid: removedCollaborator.id,
      portalAddress: removedCollaborator.portalAddress,
      blockNumber: removedCollaborator.blockNumber,
      jobName: jobs.REMOVED_COLLABORATOR,
    });
    await event.save();
    // send notification of someone removed a collaborator from portal to portal collaborators
  } catch (err) {
    console.log(err);
  }
}

async function processRemovedCollaboratorEvents(removedCollaborators) {
  const allPromises = removedCollaborators.map(async (removedCollaborator) => {
    await processRemovedCollaboratorEvent(removedCollaborator);
  });
  const data = await Promise.all(allPromises);
  return data;
}

function getLastRemovedCollaboratorCheckpoint(removedCollaborators) {
  const lastElem = (removedCollaborators || []).pop();
  return lastElem ? lastElem.blockNumber : null;
}

function updateRemovedCollaboratorCheckpoint(newCheckpoint) {
  return EventProcessor.updateOne(
    {},
    {
      $set: {
        removedCollaborator: newCheckpoint,
      },
    },
    { upsert: true }
  );
}
