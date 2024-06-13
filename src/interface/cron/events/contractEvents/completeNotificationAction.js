const Notification = require('../../../../domain/notification');

async function completeNotification({ portalAddress, forAddress, type }) {
    const complete = await Notification.markComplete({ portalAddress, forAddress, type });
    return complete;
};

module.exports = completeNotification;
