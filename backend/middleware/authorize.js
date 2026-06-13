const { errorResponse } = require('../utils/apiResponse');

const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return errorResponse(res, 'You do not have permission to perform this action', 403, 'FORBIDDEN');
    }
    next();
  };
};

module.exports = authorize;
