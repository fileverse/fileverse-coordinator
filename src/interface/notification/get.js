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
  console.log('hello');
  const { invokerAddress, portalAddress, offset, limit } = req.query;
  let isRead = req.query.isRead;
  if (isRead) {
    isRead = isRead === 'true' ? true : false;
  }
  const notifications = await notification.get({
    account: invokerAddress,
    portalAddress: portalAddress,
    offset,
    limit,
    read: isRead,
  });
  res.json(notifications);
}

module.exports = [validate(getValidation), get];
