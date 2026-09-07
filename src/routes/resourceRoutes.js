const express = require('express');
const router = express.Router();
const {
  addResource,
  getClassroomResources,
  approveResource
} = require('../controllers/resourceController');
const { verifyToken } = require('../middleware/auth');

router.post('/classrooms/:id/resources', verifyToken, addResource);
router.get('/classrooms/:id/resources', verifyToken, getClassroomResources);
router.put('/resources/:id/approve', verifyToken, approveResource);

module.exports = router;
