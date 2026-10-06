const db = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'classsync_secret_jwt_key_2026';

const verifyToken = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header (Bearer <token>)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // Fallback for development/testing: check x-user-id header
    const mockUserId = req.headers['x-user-id'] || req.query.mock_user_id;
    const allowMock = process.env.ALLOW_MOCK_AUTH === 'true' || process.env.NODE_ENV === 'test';

    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.user_id;
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token. Please log in again.' });
      }
    } else if (mockUserId && allowMock) {
      userId = parseInt(mockUserId, 10);
    } else {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in or register first.' });
    }

    // Fetch user details from database
    const [rows] = await db.query(
      'SELECT user_id, email, full_name, profile_picture_url, bio, github_link, linkedin_link, website_link FROM users WHERE user_id = ? AND is_active = true',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Authenticated user account not found or inactive.' });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({ success: false, message: 'Internal authentication error' });
  }
};

const optionalToken = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
    const mockUserId = req.headers['x-user-id'] || req.query.mock_user_id;
    const allowMock = process.env.ALLOW_MOCK_AUTH === 'true' || process.env.NODE_ENV === 'test';

    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.user_id;
      } catch (err) {
        // Ignore token errors for optional auth
      }
    } else if (mockUserId && allowMock) {
      userId = parseInt(mockUserId, 10);
    }

    if (userId) {
      const [rows] = await db.query(
        'SELECT user_id, email, full_name, profile_picture_url FROM users WHERE user_id = ? AND is_active = true',
        [userId]
      );
      if (rows.length > 0) {
        req.user = rows[0];
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { verifyToken, optionalToken };

