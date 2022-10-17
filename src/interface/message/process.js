const { message } = require("../../domain");
const { validator } = require("../middleware");
const { Joi, validate } = validator;

const createValidation = {
  params: Joi.object({
    messageId: Joi.string().required(),
  }),
};

async function create(req, res) {
  const { contractAddress, invokerAddress } = req;
  const { messageId } = req.params;
  const processedData = await message.process({ contractAddress, invokerAddress, _id: messageId });
  res.json(processedData);
}

module.exports = [validate(createValidation), create];
