const Notification = require('../../domain/notification');
const { validator } = require('../middleware');
const { Joi, validate } = validator;

const processValidation = {
  body: Joi.object({
    portalAddressList: Joi.array().optional(),
  }),
};

async function process(req, res) {
  const { invokerAddress } = req;
  const { portalAddressList } = req.body;
  const data = await Notification.markRead({ portalAddressList, forAddress: invokerAddress });
  res.json(data);
}

module.exports = [validate(processValidation), process];
