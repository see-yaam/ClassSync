const db = require('../config/db');

/**
 * Creates an in-app notification for a user
 * @param {number} userId - ID of recipient user
 * @param {string} type - Notification type (e.g. 'grade', 'code_review', 'alert', 'resource', 'live_session')
 * @param {string} title - Short title
 * @param {string} message - Message body
 * @param {string} [linkUrl] - Optional URL link for action
 */
async function createNotification(userId, type, title, message, linkUrl = null) {
  try {
    if (!userId) return;
    await db.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, link_url)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, type, title, message, linkUrl]
    );
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

module.exports = { createNotification };
