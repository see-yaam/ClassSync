const db = require('../config/db');

// GET /api/users/me/notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [rows] = await db.query(
      `SELECT notification_id, notification_type, title, message, link_url, is_read, created_at, read_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    const unreadCount = rows.filter(n => !n.is_read).length;
    res.json({ success: true, unreadCount, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/notifications/:id/read
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    await db.query(
      `UPDATE notifications SET is_read = true, read_at = NOW() WHERE notification_id = ? AND user_id = ?`,
      [id, userId]
    );

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/notifications/mark-all-read
const markAllRead = async (req, res) => {
  try {
    const userId = req.user.user_id;
    await db.query(
      `UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = ? AND is_read = false`,
      [userId]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getNotifications, markNotificationRead, markAllRead };
