const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getDashboardSummary,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  getCalendarEvents,
  exportCalendarICal
} = require('../controllers/dashboardController');

// Dashboard routes (all protected by JWT auth)
router.get('/dashboard/summary', verifyToken, getDashboardSummary);
router.get('/dashboard/calendar-events', verifyToken, getCalendarEvents);
router.get('/dashboard/calendar/export', verifyToken, exportCalendarICal);
router.get('/dashboard/todos', verifyToken, getTodos);
router.post('/dashboard/todos', verifyToken, createTodo);
router.put('/dashboard/todos/:id', verifyToken, updateTodo);
router.delete('/dashboard/todos/:id', verifyToken, deleteTodo);

module.exports = router;
