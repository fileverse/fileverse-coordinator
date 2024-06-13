const axios = require('axios');

const webhookUrl = process.env.SLACK_WEBHOOK_URL;
const channel = process.env.SLACK_CHANNEL;
const environment = process.env.DEPLOYMENT;

async function alert(error, detailedLogs) {
    if (!webhookUrl || !channel || !environment) {
        throw new Error('Missing required environment variables');
    }

    const message = {
        channel: channel,
        text: `*Environment*: ${environment}\n*Error*: ${error}\n*Detailed Logs*: ${detailedLogs}`,
        mrkdwn: true
    };

    await axios.post(webhookUrl, message);
};

module.exports = { alert };