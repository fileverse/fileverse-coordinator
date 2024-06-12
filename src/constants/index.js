const config = require("../../config");

const EVENT_PROCESS_MAX_RETRIES = 3;

const CRON = {
    BATCH_SIZE: config.CRON_BATCH_SIZE ? Number(config.CRON_BATCH_SIZE) : 10,
    PROCESS_LIMIT: config.CRON_PROCESS_LIMIT ? Number(config.CRON_PROCESS_LIMIT) : 10
}

module.exports = { EVENT_PROCESS_MAX_RETRIES, CRON };