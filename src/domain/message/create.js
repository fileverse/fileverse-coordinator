const { Message } = require('../../infra/database/models');

async function create({
  contractAddress,
  invokerAddress,
  topic,
  content,
  forAddress,
}) {
  const message = await new Message({
    contractAddress,
    invokerAddress,
    topic,
    content,
    forAddress,
  }).save();
  return message.safeObject();
}

module.exports = create;
