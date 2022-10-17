const { Message } = require('../../infra/database/models');

async function process({ _id, contractAddress, invokerAddress }) {
  const criteria = {
    _id,
    contractAddress,
    forAddress: { $in: ['*', invokerAddress.toLowerCase() ] },
  };
  const message = await Message.findOne(criteria);
  if (!message) {
    return;
  }
  message.processed = true;
  await message.save();
  return message.safeObject();
}

module.exports = process;
