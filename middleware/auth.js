import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { ApiError } from '../utils/apiError.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new ApiError(401, 'Authorization header is required'));
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Invalid authorization format. Use: Bearer <token>'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied. Insufficient permissions.'));
    }

    next();
  };
}

