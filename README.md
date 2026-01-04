# Movie Reservation Service

A backend system for a movie reservation service built with Node.js, Express, Sequelize, and PostgreSQL.

## Features

- User authentication (register, login) with JWT
- Movie management (CRUD - admin only)
- Showtime scheduling (admin only)
- Seat reservation with overbooking prevention
- Reservation management (view, cancel)
- Admin reporting (reservations, capacity, revenue)
- Rate limiting on reservation requests

## Project Structure

```
movie_reservation/
├── app.js                          # Main application entry point
├── package.json                    # Dependencies and scripts
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── README.md                       # Documentation
├── config/
│   └── database.js                # Database configuration
├── controllers/
│   ├── authController.js          # Authentication logic
│   ├── movieController.js         # Movie/showtime/admin operations
│   └── reservationController.js   # Reservation operations
├── middleware/
│   ├── auth.js                    # JWT authentication middleware
│   ├── errorHandler.js            # Global error handler
│   ├── rateLimiter.js             # Rate limiting middleware
│   └── validate.js                # Request validation middleware
├── models/
│   ├── index.js                   # Model associations
│   ├── movie.js                   # Movie model
│   ├── reservation.js             # Reservation model
│   ├── reservedSeat.js           # ReservedSeat model
│   ├── showtime.js               # Showtime model
│   └── user.js                   # User model
├── routes/
│   ├── auth.js                   # Authentication routes
│   ├── movies.js                 # Movie and showtime routes
│   └── reservations.js           # Reservation routes
├── seeders/
│   └── adminSeeder.js            # Admin user seeder
├── services/
│   └── dbSetup.js                # Database initialization
└── utils/
    └── apiError.js               # Custom error class
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from template:
```bash
cp .env.example .env
```

3. Configure your `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=movie_reservation
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
PORT=4000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

4. Start the server:
```bash
npm run dev
```

On startup:
- Database will be created if it doesn't exist
- If database exists, you'll be prompted: "Do you want to drop and recreate the database? (yes/no)"
- Initial admin user is seeded automatically

## API Endpoints

### Authentication (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |

### Authentication (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/users/:userId/promote` | Promote user to admin |

### Movies (Requires JWT)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/movies` | List all movies | All users |
| GET | `/api/movies/:movieId` | Get single movie | All users |
| POST | `/api/movies` | Create movie | Admin |
| PUT | `/api/movies/:movieId` | Update movie | Admin |
| DELETE | `/api/movies/:movieId` | Delete movie | Admin |

### Showtimes (Requires JWT)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/showtimes` | List showtimes | All users |
| GET | `/api/showtimes/:showtimeId/seats` | Get available seats | All users |
| POST | `/api/showtimes` | Create showtime | Admin |

### Reservations (Requires JWT)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/reservations` | Create reservation | All users |
| GET | `/api/reservations/me` | Get my reservations | All users |
| DELETE | `/api/reservations/:reservationId` | Cancel reservation | Owner only |

### Admin (Requires JWT + Admin Role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/reservations` | Get all reservations with reporting |

## Request/Response Examples

### Register User
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "password123"}'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "password123"}'
```

Response:
```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

### Create Movie (Admin)
```bash
curl -X POST http://localhost:4000/api/movies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Inception",
    "description": "A mind-bending thriller",
    "posterUrl": "https://example.com/inception.jpg",
    "genre": "Sci-Fi"
  }'
```

### Create Showtime (Admin)
```bash
curl -X POST http://localhost:4000/api/showtimes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "movieId": "<movie-uuid>",
    "startTime": "2025-01-15T18:00:00Z",
    "capacity": 100,
    "price": 15.50
  }'
```

### Get Available Seats
```bash
curl http://localhost:4000/api/showtimes/<showtime-uuid>/seats \
  -H "Authorization: Bearer <token>"
```

### Create Reservation
```bash
curl -X POST http://localhost:4000/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "showtimeId": "<showtime-uuid>",
    "seatNumbers": ["SEAT-001", "SEAT-002"]
  }'
```

### Cancel Reservation
```bash
curl -X DELETE http://localhost:4000/api/reservations/<reservation-uuid> \
  -H "Authorization: Bearer <token>"
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting (10 requests/minute for reservations)
- Role-based access control
- Input validation with Joi
- Overbooking prevention with database constraints

## Database Models

### User
- `id` (UUID, primary key)
- `username` (unique)
- `passwordHash`
- `role` (user/admin)

### Movie
- `id` (UUID, primary key)
- `title`
- `description`
- `posterUrl`
- `genre`

### Showtime
- `id` (UUID, primary key)
- `movieId` (foreign key)
- `startTime`
- `capacity`
- `price`

### Reservation
- `id` (UUID, primary key)
- `userId` (foreign key)
- `showtimeId` (foreign key)
- `status` (upcoming/completed/cancelled)
- `totalPrice`

### ReservedSeat
- `id` (UUID, primary key)
- `showtimeId` (foreign key)
- `reservationId` (foreign key)
- `seatNumber`
- Unique constraint: (showtimeId, seatNumber)

