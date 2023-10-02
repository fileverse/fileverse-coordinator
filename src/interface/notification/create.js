const Notification = require('../../domain/notification');
const { validator } = require('../middleware');
const { Joi, validate } = validator;

const createValidation = {
  body: Joi.object({
    type: Joi.string()
      .required()
      .valid('liveCollabInvite', 'dPageComment', 'fileMessage'),
    message: Joi.string().required(),
    forAddress: Joi.array(),
    audience: Joi.string().valid(
      'individuals',
      'members_only',
      'collaborators_only',
    ),
    content: Joi.object(),
  }),
};

async function create(req, res) {
  const { type, message, forAddress, audience } = req.body;
  const createdNotification = await Notification.createNotification({
    type,
    message,
    forAddress,
    audience,
    content,
  });
  res.json(data);
}

module.exports = [validate(createValidation), create];
