import { Router } from 'express';
import Joi from 'joi';
import { register, login, promoteToAdmin } from '../controllers/authController.js';
import { validateBody } from '../middleware/validate.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const authSchema = Joi.object({
  username: Joi.string().min(3).max(40).required(),
  password: Joi.string().min(8).required()
});

// Public routes
router.post('/register', validateBody(authSchema), register);
router.post('/login', validateBody(authSchema), login);

// Admin only routes
router.post(
  '/users/:userId/promote',
  authenticateToken,
  authorizeRoles('admin'),
  promoteToAdmin
);

export default router;

