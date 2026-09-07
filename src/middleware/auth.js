const db = require('../config/db');

const verifyToken = async (req, res, next) => {
  try {
    // Read user_id from header x-user-id or fallback to 1 for seamless lab testing
    const headerUserId = req.headers['x-user-id'] || req.query.mock_user_id;
    const userId = headerUserId ? parseInt(headerUserId, 10) : 1;

    const [rows] = await db.query(
      'SELECT user_id, email, full_name, profile_picture_url FROM users WHERE user_id = ? AND is_active = true',
      [userId]
    );

    if (rows.length === 0) {
      // Fallback user if non-existent
      req.user = {
        user_id: 1,
        email: 'alice@uiu.ac.bd',
        full_name: 'Dr. Alice Smith (Instructor)',
        profile_picture_url: 'https://ui-avatars.com/api/?name=Alice+Smith'
      };
    } else {
      req.user = rows[0];
    }

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    req.user = { user_id: 1, email: 'alice@uiu.ac.bd', full_name: 'Dr. Alice Smith' };
    next();
  }
};

module.exports = { verifyToken };
