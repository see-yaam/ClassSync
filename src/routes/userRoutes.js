const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getMe,
  updateProfile,
  changePassword,
  requestEmailChangeOTP,
  verifyEmailChangeOTP,
  getSubmissionHeatmap
} = require('../controllers/userController');
const { getActiveLiveSessions } = require('../controllers/liveSessionController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, getAllUsers);
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateProfile);
router.put('/me/password', verifyToken, changePassword);
router.post('/me/email/request-otp', verifyToken, requestEmailChangeOTP);
router.post('/me/email/verify-otp', verifyToken, verifyEmailChangeOTP);
router.get('/me/submission-heatmap', verifyToken, getSubmissionHeatmap);
router.get('/me/active-live-sessions', verifyToken, getActiveLiveSessions);

module.exports = router;

