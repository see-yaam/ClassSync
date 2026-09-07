const db = require('../config/db');

// GET /api/users - List all users (for header user-switcher during demo)
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, email, full_name, profile_picture_url FROM users WHERE is_active = true ORDER BY user_id ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/users/me - Get current logged in user details
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, email, full_name, profile_picture_url, created_at, last_login FROM users WHERE user_id = ?',
      [req.user.user_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllUsers, getMe };
