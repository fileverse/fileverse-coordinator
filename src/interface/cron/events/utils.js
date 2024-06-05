const { Event } = require("../../../infra/database/models");
const constants = require("../../../constants");
const BATCH_SIZE = constants.CRON.BATCH_SIZE;
const STATUS_API_URL = config.SUBGRAPH_STATUS_API;
const axios = require("axios");


async function fetchAddedEventsID(name) {
    const events = await Event.find({ eventName: name }).sort({ blockNumber: -1 }).limit(BATCH_SIZE);
    const eventIDs = events.map((event) => event.uuid);
    return eventIDs;
}

async function getLatestBlockNumberFromSubgraph() {
    const response = await axios.get(STATUS_API_URL);
    const statusObject = response?.data?.data['indexingStatusForCurrentVersion'] || {};
    const chains = statusObject.chains || [];
    const firstObject = chains.pop();
    return parseInt(firstObject?.latestBlock?.number, 10) || 0;
}

async function getLastEventCheckpoint(eventList) {
    if (eventList.length < BATCH_SIZE) {
        return await getLatestBlockNumberFromSubgraph();
    }
    const lastElem = (eventList || []).pop();
    return lastElem ? lastElem.blockNumber : null;
}

module.exports = { fetchAddedEventsID, getLastEventCheckpoint };