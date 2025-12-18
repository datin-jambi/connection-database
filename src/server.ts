import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import config from './config/env';
import { testConnection } from './config/database';
import logger from './utils/logger';
import { apiKeyValidator } from './middleware/auth';
import { errorHandler, notFound } from './middleware/errorHandler';
import databaseRoutes from './routes/database';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    
    if (config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    origin: req.headers.origin,
  });
  next();
});

// Routes
app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'PostgreSQL Database Gateway',
    version: '1.0.0',
    status: 'running',
  });
});

// API routes with authentication
app.use('/api/db', apiKeyValidator, databaseRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Test database connection (non-blocking)
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.warn('Database connection failed. Server will start anyway for VPN debugging.');
      logger.warn('Database endpoints may not work until connection is established.');
      // Don't exit - continue to start server
    } else {
      logger.info('✅ Database connection successful!');
    }
    
    app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🔒 CORS enabled for: ${config.allowedOrigins.join(', ')}`);
      logger.info(`🔑 API Key authentication: ${config.apiKeys.length > 0 ? 'ENABLED' : 'DISABLED'}`);
      logger.info(`💾 Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

startServer();

export default app;
