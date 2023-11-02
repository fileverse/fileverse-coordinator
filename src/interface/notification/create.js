const Notification = require('../../domain/notification');
const { validator } = require('../middleware');
const { Joi, validate } = validator;

const createValidation = {
  body: Joi.object({
    type: Joi.string()
      .required()
      .valid(
        'liveCollaborationInvite',
        'dPageComment',
        'fileMessage',
        'assetPublish',
        'assetEdit',
      ),
    message: Joi.string().required(),
    forAddress: Joi.array(),
    audience: Joi.string().valid(
      'individuals',
      'members_only',
      'collaborators_only',
      'public',
    ),
    portalAddress: Joi.string().required(),
    content: Joi.object(),
  }),
};

async function create(req, res) {
  const { type, message, forAddress, audience, portalAddress, content } =
    req.body;
  const createdNotification = await Notification.create({
    type,
    message,
    forAddress,
    audience,
    content,
    portalAddress,
  });
  res.json(createdNotification);
}

module.exports = [validate(createValidation), create];
