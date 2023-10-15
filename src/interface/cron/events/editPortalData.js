const config = require("../../../../config");
const getPortalMetadata = require("../../../domain/portal/getPortalMetadata");
const { EventProcessor, Portal } = require("../../../infra/database/models");
const agenda = require("./../index");
const jobs = require("./../jobs");
const axios = require("axios");

const API_URL = config.SUBGRAPH_API;
const EVENT_NAME = "updatedPortalDatas";

agenda.define(jobs.EDITED_PORTAL_DATA, async (job, done) => {
  try {
    const editPortalCheckpoint = await fetchEditPortalCheckpoint();
    const editedPortals = await fetchEditedPortals(editPortalCheckpoint);

    console.log(
      "Received entries",
      jobs.EDITED_PORTAL_DATA,
      editedPortals.length
    );

    await processEditedPortals(editedPortals);

    const newEditPortalCheckpoint = getNewEditPortalCheckpoint(editedPortals);
    if (newEditPortalCheckpoint) {
      await updateEditPortalCheckpoint(newEditPortalCheckpoint);
    }

    done();
  } catch (err) {
    console.error("Error in job", jobs.EDITED_PORTAL_DATA, err);
    done(err);
  } finally {
    console.log("Job done", jobs.EDITED_PORTAL_DATA);
  }
});

async function fetchEditPortalCheckpoint() {
  const eventProcessed = await EventProcessor.findOne({});
  return eventProcessed ? eventProcessed.editPortal : 0;
}

async function fetchEditedPortals(checkpoint) {
  const response = await axios.post(API_URL, {
    query: `{
      ${EVENT_NAME}(first: 5, orderDirection: asc, orderBy: blockNumber, where: {blockNumber_gt : ${checkpoint}}) {
          portalAddress,
          by,
          blockNumber,
          metadataIPFSHash,
        }
      }`,
  });
  return response?.data?.data[EVENT_NAME] || [];
}

async function processEditedPortals(editedPortals) {
  return Promise.all(
    editedPortals.map(async (editedPortal) => {
      const portalDetails = await getPortalMetadata({
        portal: {
          portalAddress: editedPortal.portalAddress,
        },
        portalMetadataIPFSHash: editedPortal.metadataIPFSHash,
      });

      if (portalDetails) {
        await Portal.updateOne(
          { portalAddress: editedPortal.portalAddress },
          {
            $set: {
              name: portalDetails.name,
              logo: portalDetails.logo,
              portalMetadataIPFSHash: editedPortal.metadataIPFSHash,
            },
          },
          { upsert: true }
        );
      }
    })
  );
}

function getNewEditPortalCheckpoint(editedPortals) {
  return editedPortals.length ? editedPortals.slice(-1)[0].blockNumber : null;
}

function updateEditPortalCheckpoint(newCheckpoint) {
  return EventProcessor.updateOne(
    {},
    {
      $set: {
        editPortal: newCheckpoint,
      },
    },
    { upsert: true }
  );
}
