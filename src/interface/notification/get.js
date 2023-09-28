const notification = require('../../domain/notification');
const { validator } = require('../middleware');
const { Joi, validate } = validator;

const getValidation = {
  query: Joi.object({
    invokerAddress: Joi.string().required(),
    portalAddress: Joi.string().optional(),
    offset: Joi.number().min(0).optional(),
    limit: Joi.number().min(1).max(50).optional(),
    isRead: Joi.bool().optional(),
  }),
};

async function get(req, res) {
  const { invokerAddress, portalAddress, offset, limit, isRead } = req.query;
  const notifications = await notification.get({
    address: invokerAddress.toLowerCase(),
    portalAddress: portalAddress.toLowerCase(),
    offset,
    limit,
    read: isRead === 'true' ? true : false,
  });
  res.json(notifications);
}

module.exports = [validate(getValidation), get];
