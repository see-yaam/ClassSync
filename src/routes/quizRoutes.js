const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { verifyToken } = require('../middleware/auth');

router.post('/quizzes/create', verifyToken, quizController.createQuiz);
router.get('/quizzes/classroom/:classroomId', verifyToken, quizController.getClassroomQuizzes);
router.get('/quizzes/:quizId', verifyToken, quizController.getQuizDetails);
router.put('/quizzes/:quizId', verifyToken, quizController.updateQuiz);
router.delete('/quizzes/:quizId', verifyToken, quizController.deleteQuiz);
router.post('/quizzes/:quizId/start', verifyToken, quizController.startQuizAttempt);
router.post('/quizzes/attempt/:attemptId/save-progress', verifyToken, quizController.saveAnswerProgress);
router.post('/quizzes/attempt/:attemptId/submit', verifyToken, quizController.submitQuizAttempt);
router.post('/quizzes/attempt/:attemptId/approve', verifyToken, quizController.approveQuizAttempt);
router.get('/quizzes/:quizId/leaderboard', verifyToken, quizController.getQuizLeaderboard);

module.exports = router;
