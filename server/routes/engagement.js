import express from 'express';
import * as engagementController from '../controllers/engagementController.js';
import { verifyUser, verifyAdmin, extractOptionalUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Daily Login Streak Rewards
router.post('/streak/claim', verifyUser, engagementController.claimDailyStreak); // POST /api/streak/claim
router.get('/streak/status', verifyUser, engagementController.getStreakStatus); // GET /api/streak/status

// Daily Compiler Challenge
router.get('/daily-challenge/calendar', verifyUser, engagementController.getDailyChallengeCalendar); // GET /api/daily-challenge/calendar
router.get('/daily-challenge', verifyUser, engagementController.getDailyChallenge); // GET /api/daily-challenge
router.post('/daily-challenge/submit', verifyUser, engagementController.submitCompilerAnswer); // POST /api/daily-challenge/submit
router.post('/daily-challenge/complete', verifyUser, engagementController.completeDailyChallenge); // POST /api/daily-challenge/complete (legacy)

// Daily Challenge Management (Admin)
router.get('/daily-challenge/admin/all', verifyUser, verifyAdmin, engagementController.getDailyChallengesAdmin);
router.post('/daily-challenge/admin', verifyUser, verifyAdmin, engagementController.createDailyChallenge);
router.post('/daily-challenge/admin/ai-generate', verifyUser, verifyAdmin, engagementController.generateAiDailyChallenge);
router.put('/daily-challenge/admin/:id', verifyUser, verifyAdmin, engagementController.updateDailyChallenge);
router.delete('/daily-challenge/admin/:id', verifyUser, verifyAdmin, engagementController.deleteDailyChallenge);

// Compiler Question Management (Admin)
router.get('/compiler-questions/admin', verifyUser, verifyAdmin, engagementController.getCompilerQuestionsAdmin);
router.post('/compiler-questions/admin', verifyUser, verifyAdmin, engagementController.createCompilerQuestion);
router.post('/compiler-questions/admin/bulk', verifyUser, verifyAdmin, engagementController.bulkUploadCompilerQuestions);
router.put('/compiler-questions/admin/:id', verifyUser, verifyAdmin, engagementController.updateCompilerQuestion);
router.delete('/compiler-questions/admin/:id', verifyUser, verifyAdmin, engagementController.deleteCompilerQuestion);

// Skill Tracks
router.get('/skill-tracks', engagementController.getSkillTracks); // GET /api/skill-tracks
router.post('/skill-tracks/:trackId/complete', verifyUser, engagementController.completeSkillModule); // POST /api/skill-tracks/:trackId/complete
router.post('/skill-tracks/:trackId/modules/:moduleId/submodules/complete', verifyUser, engagementController.completeSubModuleHandler); // POST - Complete a sub-module
router.post('/skill-tracks', verifyUser, verifyAdmin, engagementController.createSkillTrack);
router.put('/skill-tracks/:trackId', verifyUser, verifyAdmin, engagementController.updateSkillTrack);
router.delete('/skill-tracks/:trackId', verifyUser, verifyAdmin, engagementController.deleteSkillTrack);

// Tournaments
router.get('/tournaments', extractOptionalUser, engagementController.getTournaments); // GET /api/tournaments
router.get('/tournaments/history', extractOptionalUser, engagementController.getTournamentHistory); // GET /api/tournaments/history
router.get('/tournaments/:id', extractOptionalUser, engagementController.getTournamentById); // GET /api/tournaments/:id
router.post('/tournaments', verifyUser, verifyAdmin, engagementController.createTournament);
router.put('/tournaments/:id', verifyUser, verifyAdmin, engagementController.updateTournament);
router.delete('/tournaments/:id', verifyUser, verifyAdmin, engagementController.deleteTournament);
router.post('/tournaments/:id/request-join', verifyUser, engagementController.requestJoinTournament);
router.post('/tournaments/:id/join', verifyUser, engagementController.requestJoinTournament); // alias
router.post('/tournaments/:id/manage-request', verifyUser, verifyAdmin, engagementController.manageTournamentRequest);
router.post('/tournaments/:id/reveal-results', verifyUser, verifyAdmin, engagementController.revealTournamentResults);
router.get('/tournaments/:id/live', verifyUser, verifyAdmin, engagementController.getTournamentLiveTakers);
router.post('/tournaments/:id/live-heartbeat', verifyUser, engagementController.recordTournamentHeartbeat);
router.get('/tournaments/:id/leaderboard', extractOptionalUser, engagementController.getTournamentLeaderboard);
router.get('/tournaments/:id/attempts', verifyUser, verifyAdmin, engagementController.getTournamentAttempts);
router.get('/tournaments/:id/review/:attemptId', verifyUser, engagementController.getTournamentAttemptReview);

export default router;
