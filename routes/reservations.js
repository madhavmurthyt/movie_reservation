import { Router } from 'express';
import Joi from 'joi';
import {
  getAvailableSeats,
  createReservation,
  getUserReservations,
  cancelReservation
} from '../controllers/reservationController.js';
import { validateBody } from '../middleware/validate.js';
import { authenticateToken } from '../middleware/auth.js';
import { reservationLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Validation schemas
const reservationSchema = Joi.object({
  showtimeId: Joi.string().uuid().required(),
  seatNumbers: Joi.array().items(Joi.string().min(1)).min(1).required()
});

// All routes require authentication
router.use(authenticateToken);

// Get available seats for a showtime
router.get('/showtimes/:showtimeId/seats', getAvailableSeats);

// Reservation management
router.post('/reservations', reservationLimiter, validateBody(reservationSchema), createReservation);
router.get('/reservations/me', getUserReservations);
router.delete('/reservations/:reservationId', cancelReservation);

export default router;

