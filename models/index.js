import { createSequelizeInstance } from '../config/database.js';
import defineUser from './user.js';
import defineMovie from './movie.js';
import defineShowtime from './showtime.js';
import defineReservation from './reservation.js';
import defineReservedSeat from './reservedSeat.js';

const sequelize = createSequelizeInstance();

// Define models
const User = defineUser(sequelize);
const Movie = defineMovie(sequelize);
const Showtime = defineShowtime(sequelize);
const Reservation = defineReservation(sequelize);
const ReservedSeat = defineReservedSeat(sequelize);

// Associations
User.hasMany(Reservation, { foreignKey: 'userId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Movie.hasMany(Showtime, { foreignKey: 'movieId', as: 'showtimes' });
Showtime.belongsTo(Movie, { foreignKey: 'movieId', as: 'movie' });

Showtime.hasMany(Reservation, { foreignKey: 'showtimeId', as: 'reservations' });
Reservation.belongsTo(Showtime, { foreignKey: 'showtimeId', as: 'showtime' });

Reservation.hasMany(ReservedSeat, { foreignKey: 'reservationId', as: 'seats' });
ReservedSeat.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

Showtime.hasMany(ReservedSeat, { foreignKey: 'showtimeId', as: 'reservedSeats' });
ReservedSeat.belongsTo(Showtime, { foreignKey: 'showtimeId', as: 'showtime' });

export { sequelize, User, Movie, Showtime, Reservation, ReservedSeat };

