const express = require('express');
const router = express.Router();
const {
  getSupportedLanguagesList,
  addTestCase,
  getTestCases,
  updateTestCase,
  deleteTestCase,
  runAutoEvaluation,
  approveAutoGrade,
  overrideAutoGrade,
  runCodeOnly
} = require('../controllers/autoEvalController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

// Languages list (public endpoint — no auth needed for dropdown)
router.get('/piston/languages', getSupportedLanguagesList);

// Test case management (instructor/TA only)
router.post('/questions/:id/test-cases',  verifyToken, requireClassroomRole(['instructor', 'TA'], 'question'), addTestCase);
router.get('/questions/:id/test-cases',   verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'question'), getTestCases);
router.put('/test-cases/:id',             verifyToken, requireClassroomRole(['instructor', 'TA'], 'question'), updateTestCase);
router.delete('/test-cases/:id',          verifyToken, requireClassroomRole(['instructor', 'TA'], 'question'), deleteTestCase);

// Run code against public test cases (learner — no save)
router.post('/questions/:id/run-code',    verifyToken, requireClassroomRole(['learner', 'instructor', 'TA'], 'question'), runCodeOnly);

// Auto evaluation (runs ALL test cases, saves result)
router.post('/submissions/:id/auto-evaluate',  verifyToken, requireClassroomRole(['learner', 'instructor', 'TA'], 'submission'), runAutoEvaluation);

// Teacher approval workflow
router.post('/submissions/:id/approve-grade',  verifyToken, requireClassroomRole(['instructor', 'TA'], 'submission'), approveAutoGrade);
router.post('/submissions/:id/override-grade', verifyToken, requireClassroomRole(['instructor', 'TA'], 'submission'), overrideAutoGrade);

module.exports = router;
