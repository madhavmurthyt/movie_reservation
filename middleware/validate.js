import { ApiError } from '../utils/apiError.js';

export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const message = error.details.map((d) => d.message).join(', ');
      return next(new ApiError(400, message));
    }

    req.body = value;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const message = error.details.map((d) => d.message).join(', ');
      return next(new ApiError(400, message));
    }

    req.query = value;
    next();
  };
}

