require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// Route files
const authRoutes = require('./routes/auth');
const superAdminRoutes = require('./routes/superAdmin');
const collegeAdminRoutes = require('./routes/collegeAdmin');
const deptHeadRoutes = require('./routes/deptHead');
const facultyRoutes = require('./routes/faculty');
const studentRoutes = require('./routes/student');
const competitionRoutes = require('./routes/competitions');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Create uploads and logs directories if they don't exist
const fs = require('fs');
const path = require('path');

['uploads', 'logs'].forEach((dir) => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// CORS middleware - MUST be before all other middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://online-examination-system-oes-phi.vercel.app',
  process.env.CORS_ORIGIN
].filter(Boolean);

// Handle preflight OPTIONS requests explicitly before anything else
app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.CORS_ORIGIN === '*') return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all in production for now - tighten later
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware - configure helmet to not interfere with CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/admin', collegeAdminRoutes);
app.use('/api/depthead', deptHeadRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/competitions', competitionRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Online Examination System API',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const PORT = process.env.PORT || 5000;

// Create super admin if not exists
const createSuperAdmin = async () => {
  try {
    const superAdminExists = await User.findOne({ role: 'superadmin' });

    if (!superAdminExists && process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) {
      const superAdmin = await User.create({
        name: 'Super Admin',
        email: process.env.SUPER_ADMIN_EMAIL,
        password: process.env.SUPER_ADMIN_PASSWORD,
        role: 'superadmin',
        status: 'active',
      });

      logger.info(`Super Admin created: ${superAdmin.email}`);
      console.log('\n===========================================');
      console.log('🔐 SUPER ADMIN CREDENTIALS');
      console.log('===========================================');
      console.log(`Email: ${process.env.SUPER_ADMIN_EMAIL}`);
      console.log(`Password: ${process.env.SUPER_ADMIN_PASSWORD}`);
      console.log('===========================================\n');
      console.log('⚠️  IMPORTANT: Change these credentials immediately after first login!\n');
    }
  } catch (error) {
    logger.error('Error creating super admin:', error);
  }
};

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health\n`);

  // Create super admin after server starts
  createSuperAdmin();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
