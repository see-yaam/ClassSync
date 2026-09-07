const express = require('express');
const router = express.Router();
const {
  createLearnerAlert,
  getClassroomAlerts,
  resolveAlert
} = require('../controllers/alertController');
const { verifyToken } = require('../middleware/auth');

router.post('/classrooms/:id/alerts', verifyToken, createLearnerAlert);
router.get('/classrooms/:id/alerts', verifyToken, getClassroomAlerts);
router.put('/alerts/:id/resolve', verifyToken, resolveAlert);

module.exports = router;
