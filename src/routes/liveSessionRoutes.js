const express = require('express');
const router = express.Router();
const {
  createLiveSession,
  getClassroomLiveSessions,
  getLiveSessionById,
  recordAttendanceDuration,
  overrideAttendance
} = require('../controllers/liveSessionController');
const { verifyToken } = require('../middleware/auth');

router.post('/classrooms/:id/live-sessions', verifyToken, createLiveSession);
router.get('/classrooms/:id/live-sessions', verifyToken, getClassroomLiveSessions);
router.get('/live-sessions/:id', verifyToken, getLiveSessionById);
router.post('/live-sessions/:id/attendance', verifyToken, recordAttendanceDuration);
router.put('/attendance/:id/override', verifyToken, overrideAttendance);

module.exports = router;
