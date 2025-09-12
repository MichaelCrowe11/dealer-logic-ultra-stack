import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { logger } from './config/logger';
import { connectDatabase } from './database/connection';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware, type AuthRequest } from './middleware/auth';

// API Routes
import authRoutes from './api/auth';
import dealershipRoutes from './api/dealerships';
import voiceRoutes from './api/voice';
import analyticsRoutes from './api/analytics';
import pricingRoutes from './api/pricing';
import roiRoutes from './api/roi';
import crmRoutes from './api/crm';
import webhookRoutes from './api/webhooks';
import elevenlabsRoutes from './api/elevenlabs';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use((req, res, next) => {
  const origin = process.env.FRONTEND_URL || 'http://localhost:3001';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'dealer-logic-ultra-stack',
    version: '2.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dealerships', authMiddleware as any, dealershipRoutes);
app.use('/api/voice', authMiddleware as any, voiceRoutes);
app.use('/api/analytics', authMiddleware as any, analyticsRoutes);
app.use('/api/pricing', authMiddleware as any, pricingRoutes);
app.use('/api/roi', authMiddleware as any, roiRoutes);
app.use('/api/crm', authMiddleware as any, crmRoutes);
app.use('/api/elevenlabs', authMiddleware as any, elevenlabsRoutes);
app.use('/api/webhooks', webhookRoutes); // No auth for webhooks

// WebSocket handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join_dealership', (dealershipId) => {
    socket.join(`dealership_${dealershipId}`);
    logger.info(`Socket ${socket.id} joined dealership ${dealershipId}`);
  });

  socket.on('voice_call_status', (data) => {
    io.to(`dealership_${data.dealershipId}`).emit('call_update', data);
  });

  socket.on('analytics_update', (data) => {
    io.to(`dealership_${data.dealershipId}`).emit('analytics_data', data);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(errorHandler);

// Database connection and server startup
async function startServer() {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');

    server.listen(PORT, () => {
      logger.info(`Dealer Logic Ultra Stack Backend running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

startServer();

export { app, io };