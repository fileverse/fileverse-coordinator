const notification = require('../../domain/notification');

async function create(req, res) {
  const data = await notification.createNotification();
  res.json(data);
}

module.exports = [create];
