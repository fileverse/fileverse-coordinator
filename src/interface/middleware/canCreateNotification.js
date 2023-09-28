const ErrorHandler = require('../../infra/errorHandler');

async function canCreateNotification(req, res, next) {
  if (!req.invokerAddress || !req.authenticated) {
    return ErrorHandler.throwError({
      code: 403,
      message: 'Not authorized to create notification',
    });
  }
  next();
}

module.exports = canCreateNotification;
