const Notification = require('../../../domain/notification');

async function createNotification(data) {
    const createdNotification = await Notification.create(data);
    return createdNotification;
};

module.exports = createNotification;
