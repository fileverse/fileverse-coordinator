const Notification = require('../../domain/notification');
const { validator } = require('../middleware');
const { Joi, validate } = validator;

const processValidation = {
  body: Joi.object({
    notifications: Joi.array(),
  }),
};

async function process(req, res) {
  const { notifications } = req.body;
  const data = await Notification.process(notifications);
  res.json(data);
}

module.exports = [validate(processValidation), process];
