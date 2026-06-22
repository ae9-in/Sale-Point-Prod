const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
require('dotenv').config();
require('./cron'); // Initialize cron jobs

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const businessRoutes = require('./routes/business');
const targetsRoutes = require('./routes/targets');
const reportsRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');
const locationRoutes = require('./routes/locations');
const doubtsRoutes = require('./routes/doubts');
const breakRoutes = require('./routes/breaks');
const defaultTargetsRoutes = require('./routes/defaultTargets');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/targets', targetsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/doubts', doubtsRoutes);
app.use('/api/breaks', breakRoutes);
app.use('/api/default-targets', defaultTargetsRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
