const { Message } = require('../../infra/database/models');

async function create({
  contractAddress,
  invokerAddress,
  topic,
  content,
  forAddress,
}) {
  if (!forAddress) {
    forAddress = '*';
  }
  const message = await new Message({
    contractAddress,
    invokerAddress,
    topic,
    content,
    forAddress,
    processed: false,
  }).save();
  return message.safeObject();
}

module.exports = create;
