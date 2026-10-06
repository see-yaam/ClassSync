const express = require('express');
const router = express.Router();
const {
  createLiveSession,
  updateLiveSession,
  deleteLiveSession,
  getClassroomLiveSessions,
  getLiveSessionById,
  recordAttendanceDuration,
  overrideAttendance,
  startLiveSession,
  endLiveSession,
  getActiveLiveSessions,
  exportAttendanceCSV
} = require('../controllers/liveSessionController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

router.get('/users/me/active-live-sessions', verifyToken, getActiveLiveSessions);
router.post('/classrooms/:id/live-sessions', verifyToken, requireClassroomRole(['instructor', 'TA'], 'classroom'), createLiveSession);
router.put('/live-sessions/:id', verifyToken, requireClassroomRole(['instructor'], 'live-session'), updateLiveSession);
router.delete('/live-sessions/:id', verifyToken, requireClassroomRole(['instructor'], 'live-session'), deleteLiveSession);
router.get('/classrooms/:id/live-sessions', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getClassroomLiveSessions);
router.get('/live-sessions/:id', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'live-session'), getLiveSessionById);
router.put('/live-sessions/:id/start', verifyToken, requireClassroomRole(['instructor', 'TA'], 'live-session'), startLiveSession);
router.put('/live-sessions/:id/end', verifyToken, requireClassroomRole(['instructor', 'TA'], 'live-session'), endLiveSession);
router.post('/live-sessions/:id/attendance', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'live-session'), recordAttendanceDuration);
router.put('/attendance/:id/override', verifyToken, requireClassroomRole(['instructor', 'TA'], 'attendance'), overrideAttendance);
router.get('/live-sessions/:id/attendance/export', verifyToken, requireClassroomRole(['instructor', 'TA'], 'live-session'), exportAttendanceCSV);

module.exports = router;

