const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getLearnerDashboard,
  getInstructorDashboard,
  getCalendarEvents,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo
} = require('../controllers/dashboardController');

router.get('/learner', verifyToken, getLearnerDashboard);
router.get('/instructor', verifyToken, getInstructorDashboard);
router.get('/calendar', verifyToken, getCalendarEvents);

router.get('/todos', verifyToken, getTodos);
router.post('/todos', verifyToken, createTodo);
router.put('/todos/:id', verifyToken, updateTodo);
router.delete('/todos/:id', verifyToken, deleteTodo);

module.exports = router;
