import { Op } from 'sequelize';
import { Movie, Reservation, ReservedSeat, Showtime, sequelize } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

// ==================== Available Seats ====================

export async function getAvailableSeats(req, res, next) {
  try {
    const { showtimeId } = req.params;

    const showtime = await Showtime.findByPk(showtimeId);
    if (!showtime) {
      return next(new ApiError(404, 'Showtime not found'));
    }

    // Get all reserved seats for upcoming reservations
    const reservedSeats = await ReservedSeat.findAll({
      where: { showtimeId },
      include: [
        {
          model: Reservation,
          as: 'reservation',
          where: { status: 'upcoming' },
          required: true
        }
      ],
      attributes: ['seatNumber']
    });

    const reservedSeatNumbers = new Set(reservedSeats.map((s) => s.seatNumber));

    // Generate all seat numbers for the showtime
    const allSeats = Array.from({ length: showtime.capacity }, (_, i) => {
      const seatNumber = `SEAT-${String(i + 1).padStart(3, '0')}`;
      return {
        seatNumber,
        available: !reservedSeatNumbers.has(seatNumber)
      };
    });

    res.json({
      showtimeId: showtime.id,
      movieId: showtime.movieId,
      startTime: showtime.startTime,
      capacity: showtime.capacity,
      bookedSeats: reservedSeatNumbers.size,
      availableSeats: showtime.capacity - reservedSeatNumbers.size,
      price: showtime.price,
      seats: allSeats
    });
  } catch (error) {
    next(error);
  }
}

// ==================== Reservation Management ====================

export async function createReservation(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const { showtimeId, seatNumbers } = req.body;
    const userId = req.user.id;

    // Validate seat numbers array
    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      await transaction.rollback();
      return next(new ApiError(400, 'At least one seat must be selected'));
    }

    // Normalize and deduplicate seat numbers
    const normalizedSeats = [...new Set(seatNumbers.map((s) => s.trim().toUpperCase()))];
    if (normalizedSeats.length !== seatNumbers.length) {
      await transaction.rollback();
      return next(new ApiError(400, 'Duplicate seats are not allowed'));
    }

    // Check showtime exists
    const showtime = await Showtime.findByPk(showtimeId, { transaction });
    if (!showtime) {
      await transaction.rollback();
      return next(new ApiError(404, 'Showtime not found'));
    }

    // Check if showtime is in the past
    if (new Date(showtime.startTime) <= new Date()) {
      await transaction.rollback();
      return next(new ApiError(400, 'Cannot book seats for a past showtime'));
    }

    // Check for already booked seats
    const existingSeats = await ReservedSeat.findAll({
      where: {
        showtimeId,
        seatNumber: { [Op.in]: normalizedSeats }
      },
      include: [
        {
          model: Reservation,
          as: 'reservation',
          where: { status: 'upcoming' },
          required: true
        }
      ],
      transaction
    });

    if (existingSeats.length > 0) {
      const conflicting = existingSeats.map((s) => s.seatNumber).join(', ');
      await transaction.rollback();
      return next(new ApiError(409, `Seats already booked: ${conflicting}`));
    }

    // Check capacity
    const bookedCount = await ReservedSeat.count({
      where: { showtimeId },
      include: [
        {
          model: Reservation,
          as: 'reservation',
          where: { status: 'upcoming' },
          required: true
        }
      ],
      transaction
    });

    if (bookedCount + normalizedSeats.length > showtime.capacity) {
      await transaction.rollback();
      return next(new ApiError(409, 'Not enough seats available'));
    }

    // Create reservation
    const totalPrice = Number(showtime.price) * normalizedSeats.length;
    const reservation = await Reservation.create(
      {
        userId,
        showtimeId,
        status: 'upcoming',
        totalPrice
      },
      { transaction }
    );

    // Create reserved seats
    const seatRecords = normalizedSeats.map((seatNumber) => ({
      showtimeId,
      reservationId: reservation.id,
      seatNumber
    }));

    await ReservedSeat.bulkCreate(seatRecords, { transaction });
    await transaction.commit();

    // Fetch complete reservation
    const completeReservation = await Reservation.findByPk(reservation.id, {
      include: [
        { model: ReservedSeat, as: 'seats' },
        {
          model: Showtime,
          as: 'showtime',
          include: [{ model: Movie, as: 'movie' }]
        }
      ]
    });

    res.status(201).json(completeReservation);
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
}

export async function getUserReservations(req, res, next) {
  try {
    const userId = req.user.id;

    // Auto-complete past reservations
    await Reservation.update(
      { status: 'completed' },
      {
        where: {
          userId,
          status: 'upcoming'
        },
        include: [
          {
            model: Showtime,
            as: 'showtime',
            where: {
              startTime: { [Op.lt]: new Date() }
            }
          }
        ]
      }
    ).catch(() => {
      // Ignore if update fails, we'll still return reservations
    });

    const reservations = await Reservation.findAll({
      where: { userId },
      include: [
        { model: ReservedSeat, as: 'seats' },
        {
          model: Showtime,
          as: 'showtime',
          include: [{ model: Movie, as: 'movie' }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Mark past reservations as completed in response
    const now = new Date();
    const processedReservations = reservations.map((r) => {
      const reservation = r.toJSON();
      if (reservation.status === 'upcoming' && new Date(reservation.showtime.startTime) < now) {
        reservation.status = 'completed';
      }
      return reservation;
    });

    res.json(processedReservations);
  } catch (error) {
    next(error);
  }
}

export async function cancelReservation(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const { reservationId } = req.params;
    const userId = req.user.id;

    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Showtime, as: 'showtime' }],
      transaction
    });

    if (!reservation) {
      await transaction.rollback();
      return next(new ApiError(404, 'Reservation not found'));
    }

    // Check ownership
    if (reservation.userId !== userId) {
      await transaction.rollback();
      return next(new ApiError(403, 'You can only cancel your own reservations'));
    }

    // Check if already cancelled
    if (reservation.status === 'cancelled') {
      await transaction.rollback();
      return next(new ApiError(400, 'Reservation is already cancelled'));
    }

    // Check if completed
    if (reservation.status === 'completed') {
      await transaction.rollback();
      return next(new ApiError(400, 'Cannot cancel a completed reservation'));
    }

    // Check if showtime has passed
    if (new Date(reservation.showtime.startTime) <= new Date()) {
      await transaction.rollback();
      return next(new ApiError(400, 'Cannot cancel a past showtime reservation'));
    }

    // Cancel reservation and free up seats
    await reservation.update({ status: 'cancelled' }, { transaction });
    await ReservedSeat.destroy({
      where: { reservationId: reservation.id },
      transaction
    });

    await transaction.commit();
    res.status(204).end();
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
}

