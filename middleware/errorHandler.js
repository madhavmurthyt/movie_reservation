import { ValidationError } from 'sequelize';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  // Handle Sequelize validation errors
  if (err instanceof ValidationError) {
    status = 400;
    message = err.errors.map((e) => e.message).join(', ');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  }

  console.error(`[ERROR] ${status}: ${message}`);

  res.status(status).json({ error: message });
}

