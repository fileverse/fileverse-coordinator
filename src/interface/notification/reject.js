const Notification = require('../../domain/notification');
const { validator } = require('../middleware');
const { Joi, validate } = validator;

const rejectValidation = {
  body: Joi.object({
    notificationId: Joi.string().required(),
  }),
};

async function reject(req, res) {
  const { invokerAddress } = req;
  const { notificationId } = req.body;
  const data = await Notification.reject({ notificationId, forAddress: invokerAddress });
  res.json(data);
}

module.exports = [validate(rejectValidation), reject];
