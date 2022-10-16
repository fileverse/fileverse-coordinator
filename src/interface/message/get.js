const { message } = require("../../domain");

async function get(req, res) {
  const { contractAddress, invokerAddress, pageNo, pageSize } = req;
  const messages = await message.get({ contractAddress, invokerAddress, pageSize, pageNo });
  res.json(messages);
}

module.exports = [get];
