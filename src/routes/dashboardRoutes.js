const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getDashboardSummary,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo
} = require('../controllers/dashboardController');

// Dashboard routes (all protected by JWT auth)
router.get('/dashboard/summary', verifyToken, getDashboardSummary);
router.get('/dashboard/todos', verifyToken, getTodos);
router.post('/dashboard/todos', verifyToken, createTodo);
router.put('/dashboard/todos/:id', verifyToken, updateTodo);
router.delete('/dashboard/todos/:id', verifyToken, deleteTodo);

module.exports = router;
