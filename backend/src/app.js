const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Trust proxy is required for Render (and other reverse proxies) to work with express-rate-limit
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());

// CORS Config
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate Limiting (Global)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Auth Rate Limiting (Stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many auth attempts from this IP, please try again after 15 minutes' }
});
app.use('/api/v1/auth', authLimiter);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'ParkingSpot API is running' });
});

// Routes will be mounted here
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/parking', require('./routes/parking.routes'));
// app.use('/api/v1/slots', require('./routes/slot.routes'));
app.use('/api/v1/bookings', require('./routes/booking.routes'));
app.use('/api/v1/qr', require('./routes/qr.routes'));
app.use('/api/v1/ai', require('./routes/ai.routes'));
app.use('/api/v1/pricing', require('./routes/pricing.routes'));
app.use('/api/v1/slots', require('./routes/slot.routes'));
app.use('/api/v1/waitlist', require('./routes/waitlist.routes'));
app.use('/api/v1/payments', require('./routes/payment.routes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;
