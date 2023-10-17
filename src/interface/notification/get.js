const notification = require('../../domain/notification');
const { validator } = require('../middleware');
const { Joi, validate } = validator;

const getValidation = {
  query: Joi.object({
    portalAddress: Joi.string().optional(),
    offset: Joi.number().min(0).optional(),
    limit: Joi.number().min(1).max(50).optional(),
    isRead: Joi.bool().optional(),
  }),
};

async function get(req, res) {
  const { portalAddress, offset, limit } = req.query;
  let isRead = req.query.isRead;
  if (isRead) {
    isRead = isRead === 'true' ? true : false;
  }
  const notifications = await notification.get({
    address: req.invokerAddress,
    portalAddress: portalAddress,
    offset,
    limit,
    read: isRead,
  });
  res.json(notifications);
}

module.exports = [validate(getValidation), get];
