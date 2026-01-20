import express from 'express';
import * as engagementController from '../controllers/engagementController.js';
import { verifyUser, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Daily Challenge
router.get('/daily-challenge', verifyUser, engagementController.getDailyChallenge); // GET /api/daily-challenge
router.post('/daily-challenge/complete', verifyUser, engagementController.completeDailyChallenge); // POST /api/daily-challenge/complete

// Daily Challenge Management (Admin)
router.get('/daily-challenge/admin/all', verifyUser, verifyAdmin, engagementController.getDailyChallengesAdmin);
router.post('/daily-challenge/admin', verifyUser, verifyAdmin, engagementController.createDailyChallenge);
router.put('/daily-challenge/admin/:id', verifyUser, verifyAdmin, engagementController.updateDailyChallenge);
router.delete('/daily-challenge/admin/:id', verifyUser, verifyAdmin, engagementController.deleteDailyChallenge);

// Skill Tracks
router.get('/skill-tracks', engagementController.getSkillTracks); // GET /api/skill-tracks
router.post('/skill-tracks/:trackId/complete', verifyUser, engagementController.completeSkillModule); // POST /api/skill-tracks/:trackId/complete
router.post('/skill-tracks/:trackId/modules/:moduleId/submodules/complete', verifyUser, engagementController.completeSubModuleHandler); // POST - Complete a sub-module
router.post('/skill-tracks', verifyUser, verifyAdmin, engagementController.createSkillTrack);
router.put('/skill-tracks/:trackId', verifyUser, verifyAdmin, engagementController.updateSkillTrack);
router.delete('/skill-tracks/:trackId', verifyUser, verifyAdmin, engagementController.deleteSkillTrack);

// Tournaments
router.get('/tournaments', engagementController.getTournaments); // GET /api/tournaments
router.post('/tournaments', verifyUser, verifyAdmin, engagementController.createTournament);
router.put('/tournaments/:id', verifyUser, verifyAdmin, engagementController.updateTournament);
router.delete('/tournaments/:id', verifyUser, verifyAdmin, engagementController.deleteTournament);
router.post('/tournaments/:id/join', verifyUser, engagementController.joinTournament); // POST /api/tournaments/:id/join

export default router;
