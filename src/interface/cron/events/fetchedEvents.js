const { Event } = require("../../../infra/database/models");
const constants = require("../../../constants");
const BATCH_SIZE = constants.CRON.BATCH_SIZE;


async function fetchAddedEventsID(name) {
    // find last 10 events by blockNumber with eventName as name
    const events = await Event.find({ eventName: name }).sort({ blockNumber: -1 }).limit(BATCH_SIZE);
    const eventIDs = events.map((event) => event.uuid);
    return eventIDs;
}

module.exports = fetchAddedEventsID;