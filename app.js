import express from 'express';
import dotenv from 'dotenv';
import { initDatabase } from './services/dbSetup.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/auth.js';
import movieRoutes from './routes/movies.js';
import reservationRoutes from './routes/reservations.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', movieRoutes);
app.use('/api', reservationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

// Start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\nMovie Reservation Service running on http://localhost:${PORT}`);
      console.log('\nAPI Endpoints:');
      console.log('  POST /api/auth/register - Register new user');
      console.log('  POST /api/auth/login    - Login user');
      console.log('  GET  /api/movies        - List movies');
      console.log('  GET  /api/showtimes     - List showtimes');
      console.log('  POST /api/reservations  - Create reservation');
      console.log('  GET  /api/reservations/me - Get my reservations');
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });

export default app;

