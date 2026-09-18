import express from 'express';
import * as userController from '../controllers/userController.js';
import { verifyUser, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/users/:userId', verifyUser, userController.updateUser);

router.delete('/users/:userId', verifyAdmin, userController.deleteUser);
router.get(['/leaderboard', '/users/leaderboard'], userController.getPublicLeaderboard);
router.get('/user/data', verifyUser, userController.getUserData);
router.get('/users/search', verifyUser, userController.searchUsers);
router.post('/friends/request', verifyUser, userController.sendFriendRequest);
router.post('/friends/respond', verifyUser, userController.respondToFriendRequest);

// Roadmap Progress Management (Admin)
router.get('/users/:userId/roadmap/:trackId/progress', verifyAdmin, userController.getUserRoadmapProgress);
router.put('/users/:userId/roadmap/:trackId/progress', verifyAdmin, userController.updateUserRoadmapProgress);

export default router;
