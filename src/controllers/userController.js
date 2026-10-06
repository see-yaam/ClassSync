const db = require('../config/db');
const bcrypt = require('bcrypt');
const { sendOTPEmail } = require('../utils/mailer');

// GET /api/users - List all users
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

// GET /api/users/me - Get current logged in user details with bio & social links
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, email, full_name, profile_picture_url, bio, github_link, linkedin_link, website_link, created_at, last_login FROM users WHERE user_id = ?',
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

// PUT /api/users/me - Update user profile information
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { full_name, bio, github_link, linkedin_link, website_link, profile_picture_url } = req.body;

    if (!full_name || full_name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }

    await db.query(
      `UPDATE users
       SET full_name = ?,
           bio = ?,
           github_link = ?,
           linkedin_link = ?,
           website_link = ?,
           profile_picture_url = COALESCE(?, profile_picture_url),
           updated_at = NOW()
       WHERE user_id = ?`,
      [
        full_name.trim(),
        bio !== undefined ? bio.trim() : null,
        github_link !== undefined ? github_link.trim() : null,
        linkedin_link !== undefined ? linkedin_link.trim() : null,
        website_link !== undefined ? website_link.trim() : null,
        profile_picture_url || null,
        userId
      ]
    );

    const [updatedRows] = await db.query(
      'SELECT user_id, email, full_name, profile_picture_url, bio, github_link, linkedin_link, website_link, created_at, last_login FROM users WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      data: updatedRows[0]
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/users/me/password - Change user password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const [users] = await db.query('SELECT password_hash FROM users WHERE user_id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newHash, userId]);

    res.json({
      success: true,
      message: 'Password changed successfully!'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users/me/email/request-otp - Request OTP to update email address
const requestEmailChangeOTP = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { new_email } = req.body;

    if (!new_email || !new_email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid new email address is required' });
    }

    const cleanEmail = new_email.trim().toLowerCase();

    if (cleanEmail === req.user.email.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'New email address is identical to your current email address' });
    }

    // Check if new_email is already used by another user
    const [existing] = await db.query(
      'SELECT user_id FROM users WHERE email = ? AND is_verified = true AND user_id != ?',
      [cleanEmail, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await db.query(
      `INSERT INTO password_reset_otp (user_id, otp_code, otp_purpose, expires_at, is_used)
       VALUES (?, ?, 'email_change', ?, false)`,
      [userId, otpCode, expiresAt]
    );

    // Send OTP to the NEW email address
    const mailResult = await sendOTPEmail(cleanEmail, otpCode, 'email_change');
    if (!mailResult.success) {
      const errorMsg = !process.env.EMAIL_USER
        ? 'Email service is not configured (EMAIL_USER missing on server).'
        : `Email delivery failed: ${mailResult.error || 'SMTP Error'}`;
      return res.status(500).json({ success: false, message: errorMsg });
    }

    res.json({
      success: true,
      message: `Verification OTP code sent to ${cleanEmail}. Please enter the code to confirm email change.`
    });

  } catch (error) {
    console.error('Error requesting email change OTP:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users/me/email/verify-otp - Verify OTP & update email address
const verifyEmailChangeOTP = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { new_email, otp_code } = req.body;

    if (!new_email || !otp_code) {
      return res.status(400).json({ success: false, message: 'New email and OTP code are required' });
    }

    const cleanEmail = new_email.trim().toLowerCase();

    // Verify OTP
    const [otpRows] = await db.query(
      `SELECT otp_id FROM password_reset_otp
       WHERE user_id = ? AND otp_code = ? AND otp_purpose = 'email_change' AND is_used = false AND expires_at > NOW()
       ORDER BY otp_id DESC LIMIT 1`,
      [userId, otp_code.trim()]
    );

    if (otpRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP verification code' });
    }

    // Check availability once more
    const [existing] = await db.query(
      'SELECT user_id FROM users WHERE email = ? AND is_verified = true AND user_id != ?',
      [cleanEmail, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists' });
    }

    // Update email address in users table
    await db.query('UPDATE users SET email = ?, updated_at = NOW() WHERE user_id = ?', [cleanEmail, userId]);

    // Mark OTP as used
    await db.query('UPDATE password_reset_otp SET is_used = true WHERE otp_id = ?', [otpRows[0].otp_id]);

    res.json({
      success: true,
      message: 'Email address updated successfully! You must now use this new email to log in.',
      email: cleanEmail
    });

  } catch (error) {
    console.error('Error verifying email change OTP:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/users/me/submission-heatmap - 90-day daily submission counts for current user (optional ?homework_id=X)
const getSubmissionHeatmap = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { homework_id } = req.query;

    let sql = `
      SELECT DATE_FORMAT(s.submitted_at, '%Y-%m-%d') AS date, COUNT(*) AS count
      FROM submissions s
    `;
    const params = [];

    if (homework_id) {
      sql += ` JOIN questions q ON s.question_id = q.question_id WHERE s.learner_id = ? AND q.homework_id = ? AND s.submitted_at >= NOW() - INTERVAL 90 DAY`;
      params.push(userId, homework_id);
    } else {
      sql += ` WHERE s.learner_id = ? AND s.submitted_at >= NOW() - INTERVAL 90 DAY`;
      params.push(userId);
    }

    sql += ` GROUP BY DATE(s.submitted_at) ORDER BY date ASC`;

    const [rows] = await db.query(sql, params);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching submission heatmap:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users/me/avatar - Upload user avatar
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { filename, filedata } = req.body;

    if (!filename || !filedata) {
      return res.status(400).json({ success: false, message: 'Filename and filedata are required' });
    }

    const { uploadFile } = require('./uploadController');
    
    let base64Content = filedata;
    if (filedata.includes(';base64,')) {
      base64Content = filedata.split(';base64,')[1];
    }
    const buffer = Buffer.from(base64Content, 'base64');
    
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Image size exceeds 5 MB limit' });
    }

    const fs = require('fs');
    const path = require('path');
    const uploadDirectory = path.join(__dirname, '../../public/uploads');
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const uniqueFilename = `avatar_${userId}_${Date.now()}_${sanitizedFilename}`;
    const filePath = path.join(uploadDirectory, uniqueFilename);
    let avatarUrl = `/uploads/${uniqueFilename}`;

    try {
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory, { recursive: true });
      }
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      avatarUrl = filedata.startsWith('data:') ? filedata : `data:image/png;base64,${base64Content}`;
    }

    await db.query('UPDATE users SET profile_picture_url = ? WHERE user_id = ?', [avatarUrl, userId]);

    res.json({
      success: true,
      message: 'Avatar uploaded and updated successfully!',
      profile_picture_url: avatarUrl
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getMe,
  updateProfile,
  changePassword,
  requestEmailChangeOTP,
  verifyEmailChangeOTP,
  getSubmissionHeatmap,
  uploadAvatar
};

