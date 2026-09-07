const express = require('express');
const router = express.Router();
const { getAllUsers, getMe } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, getAllUsers);
router.get('/me', verifyToken, getMe);

module.exports = router;
