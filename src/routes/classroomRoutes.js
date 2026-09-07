const express = require('express');
const router = express.Router();
const {
  createClassroom,
  joinClassroom,
  getUserClassrooms,
  getClassroomById,
  updateMemberRole
} = require('../controllers/classroomController');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, createClassroom);
router.post('/join', verifyToken, joinClassroom);
router.get('/', verifyToken, getUserClassrooms);
router.get('/:id', verifyToken, getClassroomById);
router.post('/:id/members/:memberId/role', verifyToken, updateMemberRole);

module.exports = router;
