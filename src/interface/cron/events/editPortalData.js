const config = require('../../../../config');
const getPortalDetails = require('../../../domain/portal/getPortalDetails');
const getPortalMetadata = require('../../../domain/portal/getPortalMetadata');
const isAccountPresent = require('../../../domain/portal/isAccountPresent');
const {
  EventProcessor,
  Notification,
  Portal,
} = require('../../../infra/database/models');
const agenda = require('./../index');
const jobs = require('./../jobs');
const axios = require('axios');

const apiURL = config.SUBGRAPH_API;

agenda.define(jobs.EDITED_PORTAL_DATA, async (job, done) => {
  try {
    const eventProcessed = await EventProcessor.findOne({});
    let editPortalCheckpt = 0;
    if (eventProcessed) {
      editPortalCheckpt = eventProcessed.editPortal;
    }
    const eventName = 'updatedPortalDatas';
    const editPortalResult = await axios.post(apiURL, {
      query: `{
      ${eventName}(first: 5, orderDirection: asc, orderBy: blockNumber, where: {blockNumber_gt : ${editPortalCheckpt}}) {
          portalAddress,
          by,
          blockNumber,
          metadataIPFSHash,
        }
      }`,
    });

    const data = editPortalResult?.data?.data;
    const editedPortals = data[eventName];

    let newEditPortalCheckpt = null;
    if (editedPortals && editedPortals.length) {
      newEditPortalCheckpt = editedPortals.slice(-1)[0].blockNumber;
    }

    console.log(
      'Recieved entries',
      jobs.EDITED_PORTAL_DATA,
      editedPortals.length,
    );

    await Promise.all(
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
            { upsert: true },
          );
        }
      }),
    );

    if (newEditPortalCheckpt) {
      await EventProcessor.updateOne(
        {},
        {
          $set: {
            editPortal: newEditPortalCheckpt,
          },
        },
        { upsert: true },
      );
    }
    done();
  } catch (err) {
    console.error('Error in job', jobs.EDITED_PORTAL_DATA, err);
    done(err);
  } finally {
    console.log('Job done', jobs.EDITED_PORTAL_DATA);
  }
});
