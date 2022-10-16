const { Message } = require("../../infra/database/models");

async function get({ contractAddress, invokerAddress, pageNo, pageSize }) {
  const limit = pageSize;
  const offset = (pageNo ? pageNo - 1 : 0) * pageSize;
  const total = await Message.find({}).count();
  const messages = await Message.find({}).skip(offset).limit(limit);
  return { contractAddress, invokerAddress, messages, total };
}

module.exports = get;
