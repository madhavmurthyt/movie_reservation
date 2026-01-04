import { Router } from 'express';
import Joi from 'joi';
import {
  createMovie,
  updateMovie,
  deleteMovie,
  getMovies,
  getMovie,
  createShowtime,
  getShowtimes,
  getAdminReport
} from '../controllers/movieController.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const movieSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  posterUrl: Joi.string().uri().required(),
  genre: Joi.string().required()
});

const updateMovieSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  posterUrl: Joi.string().uri(),
  genre: Joi.string()
}).min(1);

const showtimeSchema = Joi.object({
  movieId: Joi.string().uuid().required(),
  startTime: Joi.date().iso().required(),
  capacity: Joi.number().integer().min(1).required(),
  price: Joi.number().min(0).required()
});

const querySchema = Joi.object({
  date: Joi.date().iso(),
  genre: Joi.string(),
  movieId: Joi.string().uuid()
});

// All routes require authentication
router.use(authenticateToken);

// Movie routes (public for authenticated users)
router.get('/movies', validateQuery(querySchema), getMovies);
router.get('/movies/:movieId', getMovie);

// Movie management (admin only)
router.post('/movies', authorizeRoles('admin'), validateBody(movieSchema), createMovie);
router.put('/movies/:movieId', authorizeRoles('admin'), validateBody(updateMovieSchema), updateMovie);
router.delete('/movies/:movieId', authorizeRoles('admin'), deleteMovie);

// Showtime routes
router.get('/showtimes', validateQuery(querySchema), getShowtimes);
router.post('/showtimes', authorizeRoles('admin'), validateBody(showtimeSchema), createShowtime);

// Admin reporting
router.get('/admin/reservations', authorizeRoles('admin'), getAdminReport);

export default router;

