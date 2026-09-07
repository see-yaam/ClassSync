const express = require('express');
const router = express.Router();
const {
  submitQuestionSolution,
  getSubmissionMatrix,
  getQuestionSubmissions
} = require('../controllers/submissionController');
const { verifyToken } = require('../middleware/auth');

router.post('/questions/:id/submit', verifyToken, submitQuestionSolution);
router.get('/homework/:id/matrix', verifyToken, getSubmissionMatrix);
router.get('/questions/:id/submissions', verifyToken, getQuestionSubmissions);

module.exports = router;
