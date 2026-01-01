import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectToDatabase } from './middleware/dbMiddleware.js';

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

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
 cors: {
   origin: "*", // Allow all connections for development
   methods: ["GET", "POST"]
 }
});

// Attach IO to app for controllers
app.set('io', io);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    res.status(500).json({ message: 'Database connection failed', error: error.message });
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

app.use('/api/badges', badgeRoutes);
app.use('/api/badge-nodes', badgeNodesRoutes);
app.use('/api/badge-trees', badgeTreesRoutes);


// Socket.io Logic
io.on('connection', (socket) => {
  socket.on('join_user', (userId) => {
    socket.join(userId);
  });

  socket.on('invite_friend', ({ fromId, toId, fromName, quizId }) => {
    io.to(toId).emit('game_invite', {
      fromId,
      fromName,
      quizId,
      roomId: `room_${fromId}_${toId}_${Date.now()}`
    });
  });

  socket.on('join_game_room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('update_progress', ({ roomId, userId, score, currentQuestion, percentage }) => {
    socket.to(roomId).emit('opponent_progress', {
      userId,
      score,
      currentQuestion,
      percentage
    });
  });
  
  socket.on('disconnect', () => {
  });
});

// Initialize DB
connectToDatabase();

if (process.env.NODE_ENV !== 'production') {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
// Force restart 2
