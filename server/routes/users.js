import express from 'express';
import * as userController from '../controllers/userController.js';
import { verifyUser, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/users/:userId', userController.updateUser); // Note: Original was /api/users/:userId without basic auth middleware explicitly but logic handled it? No, verifyUser was used generally?
// Checking original: app.put('/api/users/:userId', async...) -> No verifyUser middleware in definition!
// BUT wait, verifyUser middleware verifies headers. If it was global?
// Original: app.use(async (req, res, next) => await connectToDatabase()...)
// app.put('/api/users/:userId', async...) -> It was PUBLICLY accessible if you knew the ID? 
// No, verifyUser is middleware.
// Line 350: app.put('/api/users/:userId', async (req, res) => { ... }) matches original. 
// It seems it was unauthenticated in the original code! Or relied on client sending data.
// Wait, for safety, let's keep it as is (no verifyUser) to match behavior, but ideally it should have it.
// Actually, looking at line 116, verifyUser is defined but explicitly used in some routes like app.get('/api/data', verifyUser...).
// So line 350 did NOT have verifyUser.

router.delete('/users/:userId', verifyAdmin, userController.deleteUser);
router.get('/user/data', verifyUser, userController.getUserData);
router.get('/users/search', verifyUser, userController.searchUsers);
router.post('/friends/request', verifyUser, userController.sendFriendRequest);
router.post('/friends/respond', verifyUser, userController.respondToFriendRequest);

export default router;
