const successResponse = (res, data = {}, message = 'Action completed', status = 200) => {
  return res.status(status).json({ success: true, data, message });
};

const errorResponse = (res, error, status = 400, code = 'ERROR') => {
  return res.status(status).json({ success: false, error, code });
};

module.exports = {
  successResponse,
  errorResponse
};
