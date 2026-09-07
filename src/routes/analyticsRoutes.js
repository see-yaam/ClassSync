const express = require('express');
const router = express.Router();
const { getLeaderboard, getClassHealth } = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/auth');

router.get('/classrooms/:id/leaderboard', verifyToken, getLeaderboard);
router.get('/classrooms/:id/health', verifyToken, getClassHealth);

module.exports = router;
