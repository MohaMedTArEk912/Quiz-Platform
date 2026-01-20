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
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
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
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://thequizplatform.netlify.app",
  "https://thequizplatform.vercel.app"
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

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
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.some(o => origin.startsWith(o)) || 
                         origin.endsWith('.vercel.app') || 
                         origin.endsWith('.netlify.app');
        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
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
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(o => origin.startsWith(o)) || 
                     origin.endsWith('.vercel.app') || 
                     origin.endsWith('.netlify.app');
                     
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));


// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 2000, // Strict in production (100 reqs / 15 min)
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, 
  legacyHeaders: false,
});
app.use('/api', limiter);

// Data Sanitization & Protection
// Note: mongo-sanitize and xss-clean are often incompatible with Express 5
// Using Zod for majority of input validation (see validationMiddleware.js)
app.use(hpp());

// Basic XSS Protection for all responses
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

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
    console.error('❌ DB_MIDDLEWARE_ERROR:', error.message);
    // Ensure headers aren't already sent
    if (!res.headersSent) {
        res.status(500).json({ 
        message: 'Database connection failed', 
        error: error.message,
        hint: 'Check MongoDB URI and network connectivity'
        });
    }
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
// In-memory game state
const gameRooms = new Map();

if (io) io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Client connected:', socket.id);
  }
  
  socket.on('join_user', (userId) => {
    socket.userId = userId; // Store userId on socket
    socket.join(userId);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`👤 User ${userId} joined their room`);
    }
  });

  socket.on('join_game_room', (roomId) => {
    socket.join(roomId);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🚪 Socket ${socket.id} (User: ${socket.userId}) joined game room ${roomId}`);
    }

    // Initialize or update room state
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, { players: {} });
    }
    
    // Register player in room if userId is known
    if (socket.userId) {
        const room = gameRooms.get(roomId);
        if (!room.players[socket.userId]) {
            room.players[socket.userId] = { finished: false, score: 0, timeTaken: 0 };
        }
    }

    // Check room size to auto-start
    const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    if (roomSize === 2) {
      io.to(roomId).emit('match_ready');
    }
  });

  socket.on('challenge_user', ({ to, quizId, from }) => {
     // Alias to invite_friend architecture or direct handling
     // We need detailed info. Best to stick to invite_friend, but let's handle this payload too just in case.
     // In a real app, we'd fetch names. For now, assuming client sends 'invite_friend' usually.
     // If client sends 'challenge_user', we will forward it as 'game_invite' if we can,
     // or better, rely on the client fixing the emit name.
     // IMPLEMENTATION DECISION: I will fix the Client to use 'invite_friend' to match existing server logic.
     // BUT, I will add this handler to ensure backward compatibility or catch the lingering event.
     io.to(to).emit('game_invite', {
        fromId: from,
        fromName: 'Friend', // Fallback as we don't have name easily here without DB lookup
        quizId,
        roomId: `room_${from}_${to}_${Date.now()}`
     });
  });

  socket.on('invite_friend', ({ fromId, toId, fromName, quizId }) => {
    const roomId = `room_${fromId}_${toId}_${Date.now()}`;
    io.to(toId).emit('game_invite', {
      fromId,
      fromName,
      quizId,
      roomId
    });
    // Also let the sender know the Room ID to join!
    socket.emit('challenge_created', { roomId });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🎮 Game invite sent from ${fromName} to ${toId}`);
    }
  });

  socket.on('update_progress', ({ roomId, userId, score, currentQuestion, percentage }) => {
    socket.to(roomId).emit('opponent_progress', {
      userId,
      score,
      currentQuestion,
      percentage
    });
    
    // Update server state if possible
    if (gameRooms.has(roomId)) {
        const room = gameRooms.get(roomId);
        if (room.players[userId]) {
            room.players[userId].score = score;
        } else {
            // Lazy init if missed join
            room.players[userId] = { finished: false, score, timeTaken: 0 };
        }
    }
  });

  socket.on('quiz_completed', ({ roomId, userId, score, timeTaken }) => {
    if (!gameRooms.has(roomId)) return;
    
    const room = gameRooms.get(roomId);
    if (!room.players[userId]) {
         room.players[userId] = { finished: true, score, timeTaken };
    } else {
         room.players[userId].finished = true;
         room.players[userId].score = score;
         room.players[userId].timeTaken = timeTaken;
    }
    
    // Check if expected number of players finished (assuming 2 for VS)
    const playerIds = Object.keys(room.players);
    const allFinished = playerIds.length >= 2 && playerIds.every(id => room.players[id].finished);
    
    if (allFinished) {
        // Calculate Winner
        const players = Object.entries(room.players).map(([id, stats]) => ({ id, ...stats }));
        
        // Sort by Score (Desc), then Time (Asc)
        players.sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken);
        
        const winner = players[0];
        const runnerUp = players[1];
        
        const isDraw = winner.score === runnerUp.score && winner.timeTaken === runnerUp.timeTaken;
        
        io.to(roomId).emit('game_over', {
            winnerId: isDraw ? null : winner.id,
            isDraw,
            results: room.players
        });
        
        // Cleanup room after delay
        setTimeout(() => {
            gameRooms.delete(roomId);
        }, 3600000); // 1 hour cleanup just in case
    }
  });
  
  socket.on('disconnect', (reason) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
    }
    // Potential: Check if user was in active game and forfeit? 
    // Keeping it simple for now.
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
    console.error('❌ Validation Error Details:', JSON.stringify(error.errors, null, 2));
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

// Serve Static Files from the frontend build
const distPath = path.join(projectRoot, 'dist');
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

// 404 Handler for API routes
// Note: Express 5 / path-to-regexp v8+ requires named wildcards: {*name}
app.use('/api/{*path}', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API Route not found',
    path: req.path
  });
});

// Single Page Application (SPA) routing - Must be AFTER API routes
// Note: Express 5 / path-to-regexp v8+ requires named wildcards: {*name}
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Initialize DB
// connectToDatabase(); // Removed to prevent cold-start crashes. Handled by middleware.

if (!isServerless) {
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
