import { Op } from 'sequelize';
import { Movie, Showtime, Reservation, ReservedSeat, User, sequelize } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

// ==================== Movie Management ====================

export async function createMovie(req, res, next) {
  try {
    const { title, description, posterUrl, genre } = req.body;
    const movie = await Movie.create({ title, description, posterUrl, genre });
    res.status(201).json(movie);
  } catch (error) {
    next(error);
  }
}

export async function updateMovie(req, res, next) {
  try {
    const { movieId } = req.params;
    const movie = await Movie.findByPk(movieId);

    if (!movie) {
      return next(new ApiError(404, 'Movie not found'));
    }

    const updateFields = {};
    if (req.body.title) updateFields.title = req.body.title;
    if (req.body.description) updateFields.description = req.body.description;
    if (req.body.posterUrl) updateFields.posterUrl = req.body.posterUrl;
    if (req.body.genre) updateFields.genre = req.body.genre;

    await movie.update(updateFields);
    res.json(movie);
  } catch (error) {
    next(error);
  }
}

export async function deleteMovie(req, res, next) {
  try {
    const { movieId } = req.params;
    const movie = await Movie.findByPk(movieId);

    if (!movie) {
      return next(new ApiError(404, 'Movie not found'));
    }

    await movie.destroy();
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function getMovies(req, res, next) {
  try {
    const { date, genre } = req.query;
    const movieWhere = {};
    const showtimeWhere = {};

    if (genre) {
      movieWhere.genre = genre;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      showtimeWhere.startTime = {
        [Op.between]: [startOfDay, endOfDay]
      };
    }

    const movies = await Movie.findAll({
      where: movieWhere,
      include: [
        {
          model: Showtime,
          as: 'showtimes',
          where: Object.keys(showtimeWhere).length > 0 ? showtimeWhere : undefined,
          required: false,
          order: [['startTime', 'ASC']]
        }
      ]
    });

    res.json(movies);
  } catch (error) {
    next(error);
  }
}

export async function getMovie(req, res, next) {
  try {
    const { movieId } = req.params;
    const movie = await Movie.findByPk(movieId, {
      include: [
        {
          model: Showtime,
          as: 'showtimes',
          order: [['startTime', 'ASC']]
        }
      ]
    });

    if (!movie) {
      return next(new ApiError(404, 'Movie not found'));
    }

    res.json(movie);
  } catch (error) {
    next(error);
  }
}

// ==================== Showtime Management ====================

export async function createShowtime(req, res, next) {
  try {
    const { movieId, startTime, capacity, price } = req.body;

    const movie = await Movie.findByPk(movieId);
    if (!movie) {
      return next(new ApiError(404, 'Movie not found'));
    }

    const showtime = await Showtime.create({
      movieId,
      startTime,
      capacity,
      price
    });

    res.status(201).json(showtime);
  } catch (error) {
    next(error);
  }
}

export async function getShowtimes(req, res, next) {
  try {
    const { date, movieId } = req.query;
    const where = {};

    if (movieId) {
      where.movieId = movieId;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.startTime = {
        [Op.between]: [startOfDay, endOfDay]
      };
    }

    const showtimes = await Showtime.findAll({
      where,
      include: [
        {
          model: Movie,
          as: 'movie'
        }
      ],
      order: [['startTime', 'ASC']]
    });

    // Calculate available seats for each showtime
    const showtimeIds = showtimes.map((s) => s.id);

    const seatCounts = showtimeIds.length > 0
      ? await ReservedSeat.findAll({
          attributes: [
            'showtimeId',
            [sequelize.fn('COUNT', sequelize.col('id')), 'bookedSeats']
          ],
          where: { showtimeId: { [Op.in]: showtimeIds } },
          include: [
            {
              model: Reservation,
              as: 'reservation',
              attributes: [],
              where: { status: 'upcoming' },
              required: true
            }
          ],
          group: ['showtimeId']
        })
      : [];

    const seatMap = new Map(
      seatCounts.map((row) => [row.showtimeId, Number(row.get('bookedSeats'))])
    );

    const response = showtimes.map((showtime) => {
      const bookedSeats = seatMap.get(showtime.id) || 0;
      return {
        ...showtime.toJSON(),
        bookedSeats,
        availableSeats: showtime.capacity - bookedSeats
      };
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
}

// ==================== Admin Reporting ====================

export async function getAdminReport(req, res, next) {
  try {
    // Get all reservations
    const reservations = await Reservation.findAll({
      include: [
        { model: Showtime, as: 'showtime', include: [{ model: Movie, as: 'movie' }] },
        { model: ReservedSeat, as: 'seats' },
        { model: User, as: 'user', attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get showtime summary
    const showtimes = await Showtime.findAll({
      include: [{ model: Movie, as: 'movie' }]
    });

    // Calculate booked seats and revenue for each showtime
    const showtimeSummary = await Promise.all(
      showtimes.map(async (showtime) => {
        const upcomingReservations = await Reservation.findAll({
          where: { showtimeId: showtime.id, status: 'upcoming' },
          include: [{ model: ReservedSeat, as: 'seats' }]
        });

        const completedReservations = await Reservation.findAll({
          where: { showtimeId: showtime.id, status: 'completed' }
        });

        const bookedSeats = upcomingReservations.reduce(
          (sum, r) => sum + r.seats.length,
          0
        );

        const revenue = completedReservations.reduce(
          (sum, r) => sum + Number(r.totalPrice),
          0
        );

        return {
          showtimeId: showtime.id,
          movieTitle: showtime.movie?.title,
          startTime: showtime.startTime,
          capacity: showtime.capacity,
          bookedSeats,
          availableSeats: showtime.capacity - bookedSeats,
          revenue
        };
      })
    );

    const totals = {
      totalCapacity: showtimeSummary.reduce((sum, s) => sum + s.capacity, 0),
      totalBookedSeats: showtimeSummary.reduce((sum, s) => sum + s.bookedSeats, 0),
      totalRevenue: showtimeSummary.reduce((sum, s) => sum + s.revenue, 0)
    };

    totals.totalAvailableSeats = totals.totalCapacity - totals.totalBookedSeats;

    res.json({
      reservations,
      showtimeSummary,
      totals
    });
  } catch (error) {
    next(error);
  }
}


