const express = require('express');
const router = express.Router();
const {
  getClassroomProblems,
  createProblem,
  getProblemById,
  upsertProblemAnswer
} = require('../controllers/problemController');
const { verifyToken } = require('../middleware/auth');

router.get('/classrooms/:id/problems', verifyToken, getClassroomProblems);
router.post('/classrooms/:id/problems', verifyToken, createProblem);
router.get('/problems/:id', verifyToken, getProblemById);
router.post('/problems/:id/answer', verifyToken, upsertProblemAnswer);

module.exports = router;
