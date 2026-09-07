const express = require('express');
const router = express.Router();
const {
  runPlagiarismScan,
  getPlagiarismFlags,
  reviewPlagiarismFlag
} = require('../controllers/plagiarismController');
const { verifyToken } = require('../middleware/auth');

router.post('/classrooms/:id/plagiarism-check', verifyToken, runPlagiarismScan);
router.get('/classrooms/:id/plagiarism-flags', verifyToken, getPlagiarismFlags);
router.put('/plagiarism-flags/:id/review', verifyToken, reviewPlagiarismFlag);

module.exports = router;
