const ErrorHandler = require('./../../infra/errorHandler');

async function canViewNotification(req, res, next) {
  if (!req.invokerAddress || !req.isAuthenticated) {
    return ErrorHandler.throwError({
      code: 403,
      message: 'Not authorized to view notification',
    });
  }
  next();
}

module.exports = canViewNotification;
