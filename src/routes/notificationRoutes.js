const express = require('express');
const router = express.Router();
const { getNotifications, markNotificationRead, markAllRead } = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');

router.get('/me/notifications', verifyToken, getNotifications);
router.put('/notifications/:id/read', verifyToken, markNotificationRead);
router.post('/notifications/mark-all-read', verifyToken, markAllRead);

module.exports = router;
