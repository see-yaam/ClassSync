const express = require('express');
const router = express.Router();
const {
  createHomework,
  togglePublishHomework,
  getClassroomHomework,
  getHomeworkById,
  addQuestion,
  getQuestionAnswer
} = require('../controllers/homeworkController');
const { verifyToken } = require('../middleware/auth');

router.post('/classrooms/:id/homework', verifyToken, createHomework);
router.get('/classrooms/:id/homework', verifyToken, getClassroomHomework);
router.put('/homework/:id/publish', verifyToken, togglePublishHomework);
router.get('/homework/:id', verifyToken, getHomeworkById);
router.post('/homework/:id/questions', verifyToken, addQuestion);
router.get('/questions/:id/answer', verifyToken, getQuestionAnswer);

module.exports = router;
