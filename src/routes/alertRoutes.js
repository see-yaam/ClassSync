const express = require('express');
const router = express.Router();
const {
  createLearnerAlert,
  getClassroomAlerts,
  resolveAlert,
  clearLearnerAlerts,
  nudgeLearner
} = require('../controllers/alertController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

router.post('/classrooms/:id/alerts', verifyToken, requireClassroomRole(['instructor', 'TA'], 'classroom'), createLearnerAlert);
router.get('/classrooms/:id/alerts', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getClassroomAlerts);
router.put('/alerts/:id/resolve', verifyToken, requireClassroomRole(['instructor', 'TA'], 'alert'), resolveAlert);
router.put('/classrooms/:id/learners/:learnerId/clear-alerts', verifyToken, requireClassroomRole(['instructor', 'TA'], 'classroom'), clearLearnerAlerts);
router.post('/alerts/nudge', verifyToken, nudgeLearner);

module.exports = router;
