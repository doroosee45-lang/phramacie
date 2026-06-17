const logger = require('../utils/logger');

exports.errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') { message = 'Ressource introuvable'; statusCode = 404; }
  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `La valeur '${err.keyValue[field]}' existe déjà pour le champ '${field}'`;
    statusCode = 400;
  }
  // Mongoose validation
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(e => e.message).join(', ');
    statusCode = 400;
  }

  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`);

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
