const { message } = require("../../domain");
const { validator } = require("../middleware");
const { Joi, validate } = validator;

const createValidation = {
  body: Joi.object({
    topic: Joi.string().required(),
    content: Joi.string().required(),
    forAddress: Joi.string().required(),
  }),
};

async function create(req, res) {
  const { contractAddress, invokerAddress } = req;
  let { topic, content, forAddress } = req.body;
  const createdData = await message.create({
    contractAddress,
    invokerAddress,
    topic,
    content,
    forAddress,
  });
  res.json(createdData);
}

module.exports = [validate(createValidation), create];
