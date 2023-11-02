const Notification = require('../../domain/notification');

async function unread(req, res) {
  const data = await Notification.unread(req.invokerAddress);
  res.json(data);
}

module.exports = [unread];
