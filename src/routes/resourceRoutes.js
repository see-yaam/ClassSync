const express = require('express');
const router = express.Router();
const {
  addResource,
  getClassroomResources,
  approveResource,
  editResource,
  deleteResource
} = require('../controllers/resourceController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

router.post('/classrooms/:id/resources', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), addResource);
router.get('/classrooms/:id/resources', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getClassroomResources);
router.put('/resources/:id/approve', verifyToken, requireClassroomRole(['instructor', 'TA'], 'resource'), approveResource);
router.put('/resources/:id', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'resource'), editResource);
router.delete('/resources/:id', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'resource'), deleteResource);

module.exports = router;
