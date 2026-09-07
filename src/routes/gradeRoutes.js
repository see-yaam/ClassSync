const express = require('express');
const router = express.Router();
const {
  gradeSubmission,
  addCodeReview,
  getCodeReviews
} = require('../controllers/gradeController');
const { verifyToken } = require('../middleware/auth');

router.post('/submissions/:id/grade', verifyToken, gradeSubmission);
router.post('/submissions/:id/code-reviews', verifyToken, addCodeReview);
router.get('/submissions/:id/code-reviews', verifyToken, getCodeReviews);

module.exports = router;
