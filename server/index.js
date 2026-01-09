import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
// Only load from .env files in development (Vercel handles env vars automatically)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Provider and key presence checks (non-fatal)
if (!process.env.GROQ_API_KEY || !String(process.env.GROQ_API_KEY).trim()) {
  console.warn('⚠️  GROQ_API_KEY is missing. Groq requests will fail until set.');
} else {
  console.log('✅ Groq API Key loaded successfully');
}

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectToDatabase } from './middleware/dbMiddleware.js';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// import mongoSanitize from 'express-mongo-sanitize'; // Conflict with Express 5
import hpp from 'hpp';
// import xss from 'xss-clean'; // Deprecated and causes issues with Express 5

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import quizRoutes from './routes/quizzes.js';
import attemptRoutes from './routes/attempts.js';
import reviewRoutes from './routes/reviews.js';
import challengeRoutes from './routes/challenges.js';
import shopRoutes from './routes/shop.js';
import engagementRoutes from './routes/engagement.js';
import analyticsRoutes from './routes/analytics.js';
import badgeRoutes from './routes/badges.js';
import badgeNodesRoutes from './routes/badgeNodes.js';
import badgeTreesRoutes from './routes/badgeTrees.js';
import studyCardsRoutes from './routes/studyCards.js';
import clanRoutes from './routes/clanRoutes.js';
import compilerRoutes from './routes/compiler.js';
import aiRoutes from './routes/ai.js';
import subjectRoutes from './routes/subjects.js';
import aiStudioRoutes from './routes/aiStudio.js';

// IMPORTANT: Vercel serverless functions are not compatible with long-lived
// HTTP servers / Socket.IO the same way as a traditional Node process.
// Initialize Socket.IO only for non-serverless environments.
const isServerless = !!process.env.VERCEL;

const app = express();
let httpServer = null;
let io = null;

if (!isServerless) {
  httpServer = createServer(app);

  // Set timeout for long-running requests (like AI quiz generation)
  httpServer.setTimeout(300000);           // Socket timeout: 5 minutes
  httpServer.keepAliveTimeout = 300000;    // Keep-alive: 5 minutes
  httpServer.headersTimeout = 310000;      // Headers: ~5.2 minutes

  // Socket.io configuration optimized for Netlify
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || ["http://localhost:5173", "http://localhost:3000", "https://thequizplatform.netlify.app"],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });
}

// Attach IO to app for controllers (null on serverless)
app.set('io', io);

const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || ["http://localhost:5173", "http://localhost:3000", "https://thequizplatform.netlify.app"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'] // Keep x-user-id for now if legacy still sends it, but add Authorization
}));
app.use(express.json({ limit: '50mb' }));


// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Relaxed limit for development
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', limiter);

// Data Sanitization
// app.use(mongoSanitize());
// app.use(xss()); // Deprecated
app.use(hpp());

// Health Check Route (Bypasses DB middleware)
app.get('/api/health-check', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date(),
    env: {
      mongo_defined: !!process.env.MONGODB_URI,
      client_url: process.env.CLIENT_URL
    }
  });
});

// Middleware to ensure DB connection (with timeout protection for serverless)
app.use(async (req, res, next) => {
  // Skip DB check for health check endpoint
  if (req.path === '/api/health-check') {
    return next();
  }
  
  try {
    // Set a timeout for DB connection in serverless environments
    // Use Mongoose's internal connection logic
    await connectToDatabase();


    
    next();
  } catch (error) {
    console.error('DB middleware error:', error.message);
    res.status(500).json({ 
      message: 'Database connection failed', 
      error: error.message,
      hint: 'Check MongoDB URI and network connectivity'
    });
  }
});

// Mount Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes); // mounts /users/:userId etc.
app.use('/api/quizzes', quizRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api', engagementRoutes); // mounts /daily-challenge, /skill-tracks, /tournaments
app.use('/api', analyticsRoutes); // mounts /analytics/summary, /data
app.use('/api/study-cards', studyCardsRoutes);
app.use('/api/clans', clanRoutes);
app.use('/api', compilerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/ai-studio', aiStudioRoutes);

app.use('/api/badges', badgeRoutes);
app.use('/api/badge-nodes', badgeNodesRoutes);
app.use('/api/badge-trees', badgeTreesRoutes);


// Socket.io event handlers (disabled on Vercel serverless)
if (io) io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Client connected:', socket.id);
  }
  
  socket.on('join_user', (userId) => {
    socket.join(userId);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`👤 User ${userId} joined their room`);
    }
  });

  socket.on('invite_friend', ({ fromId, toId, fromName, quizId }) => {
    const roomId = `room_${fromId}_${toId}_${Date.now()}`;
    io.to(toId).emit('game_invite', {
      fromId,
      fromName,
      quizId,
      roomId
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🎮 Game invite sent from ${fromName} to ${toId}`);
    }
  });

  socket.on('join_game_room', (roomId) => {
    socket.join(roomId);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🚪 Socket ${socket.id} joined game room ${roomId}`);
    }
  });

  socket.on('update_progress', ({ roomId, userId, score, currentQuestion, percentage }) => {
    socket.to(roomId).emit('opponent_progress', {
      userId,
      score,
      currentQuestion,
      percentage
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 Progress update in room ${roomId}: ${percentage}%`);
    }
  });
  
  socket.on('disconnect', (reason) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
    }
  });
});

// Global Error Handler - Must be last
app.use((error, req, res, next) => {
  console.error('\n❌ === GLOBAL ERROR HANDLER ===');
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error('Error:', error.message);
  console.error('Name:', error.name);
  
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', error.stack);
  }
  console.error('=== END GLOBAL ERROR ===\n');

  // Handle different error types
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';

  // Database errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    statusCode = 500;
    message = 'Database error occurred';
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// 404 Handler - Must be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Initialize DB
// connectToDatabase(); // Removed to prevent cold-start crashes. Handled by middleware.

if (process.env.NODE_ENV !== 'production') {
  if (!httpServer) {
    console.warn('⚠️  httpServer not initialized; running serverless mode.');
  } else {
    httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  }
}

export default app;
// Force restart 2
