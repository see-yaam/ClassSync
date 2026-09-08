const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'classsync_secret_jwt_key_2026';

// In-memory store for pending registrations (keyed by email)
// Held temporarily until OTP is verified
const pendingRegistrations = new Map();

// POST /api/auth/register - Step 1: Submit email, password, full_name (Hold pending, send OTP)
const register = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Email, password, and full name are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists and is verified
    const [existing] = await db.query(
      `SELECT user_id FROM users WHERE email = ? AND is_verified = true`,
      [cleanEmail]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists' });
    }

    // Hash password for pending store
    const passwordHash = await bcrypt.hash(password, 10);

    // Save in pending registrations store (expires after 15 mins)
    pendingRegistrations.set(cleanEmail, {
      email: cleanEmail,
      password_hash: passwordHash,
      full_name: full_name.trim(),
      createdAt: Date.now()
    });

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to password_reset_otp table
    await db.query(
      `INSERT INTO password_reset_otp (user_id, otp_code, otp_purpose, expires_at, is_used)
       VALUES (NULL, ?, 'registration', ?, false)`,
      [otpCode, expiresAt]
    );

    // Send OTP via Nodemailer Email
    await sendOTPEmail(cleanEmail, otpCode, 'registration');

    res.json({
      success: true,
      message: `OTP sent to ${cleanEmail}. Please verify within 10 minutes to complete registration.`,
      email: cleanEmail
    });
  } catch (error) {
    console.error('Error during registration request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/verify-otp - Step 2: Verify OTP & Create Actual User Row
const verifyOtp = async (req, res) => {
  try {
    const { email, otp_code } = req.body;

    if (!email || !otp_code) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pendingUser = pendingRegistrations.get(cleanEmail);

    if (!pendingUser) {
      return res.status(400).json({
        success: false,
        message: 'Registration session expired or not found. Please register again.'
      });
    }

    // Verify OTP from password_reset_otp table
    const [otpRows] = await db.query(
      `SELECT otp_id, expires_at FROM password_reset_otp
       WHERE otp_code = ? AND otp_purpose = 'registration' AND is_used = false AND expires_at > NOW()
       ORDER BY otp_id DESC LIMIT 1`,
      [otp_code.trim()]
    );

    if (otpRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP verification code' });
    }

    const otpRecord = otpRows[0];

    // NOW create the actual row in users table
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingUser.full_name)}&background=2563eb&color=fff`;

    // Handle existing unverified row if any
    await db.query(`DELETE FROM users WHERE email = ? AND is_verified = false`, [cleanEmail]);

    const [userResult] = await db.query(
      `INSERT INTO users (email, password_hash, full_name, profile_picture_url, is_verified, is_active, last_login)
       VALUES (?, ?, ?, ?, true, true, NOW())`,
      [cleanEmail, pendingUser.password_hash, pendingUser.full_name, defaultAvatar]
    );

    const userId = userResult.insertId;

    // Mark OTP as used and associate user_id
    await db.query(
      `UPDATE password_reset_otp SET is_used = true, user_id = ? WHERE otp_id = ?`,
      [userId, otpRecord.otp_id]
    );

    // Remove from pending registrations store
    pendingRegistrations.delete(cleanEmail);

    // Issue JWT token
    const token = jwt.sign(
      { user_id: userId, email: cleanEmail, full_name: pendingUser.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Account verified and created successfully!',
      token,
      user: {
        user_id: userId,
        email: cleanEmail,
        full_name: pendingUser.full_name,
        profile_picture_url: defaultAvatar
      }
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login - Authenticate with email & password, issue JWT
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query user
    const [rows] = await db.query(
      `SELECT user_id, email, password_hash, full_name, profile_picture_url, is_verified, is_active
       FROM users WHERE email = ?`,
      [cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    // Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update last_login
    await db.query(`UPDATE users SET last_login = NOW() WHERE user_id = ?`, [user.user_id]);

    // Issue JWT token
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        profile_picture_url: user.profile_picture_url
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/forgot-password - Trigger password reset OTP
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [users] = await db.query(
      `SELECT user_id, full_name FROM users WHERE email = ? AND is_active = true`,
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'No active account found with this email address' });
    }

    const user = users[0];

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Insert into password_reset_otp
    await db.query(
      `INSERT INTO password_reset_otp (user_id, otp_code, otp_purpose, expires_at, is_used)
       VALUES (?, ?, 'password_reset', ?, false)`,
      [user.user_id, otpCode, expiresAt]
    );

    // Send email
    await sendOTPEmail(cleanEmail, otpCode, 'password_reset');

    res.json({
      success: true,
      message: `Password reset verification code sent to ${cleanEmail}`,
      email: cleanEmail
    });
  } catch (error) {
    console.error('Error during forgot password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/reset-password - Verify OTP and update password
const resetPassword = async (req, res) => {
  try {
    const { email, otp_code, new_password } = req.body;

    if (!email || !otp_code || !new_password) {
      return res.status(400).json({ success: false, message: 'Email, OTP code, and new password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [users] = await db.query(`SELECT user_id FROM users WHERE email = ?`, [cleanEmail]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userId = users[0].user_id;

    // Verify OTP
    const [otpRows] = await db.query(
      `SELECT otp_id FROM password_reset_otp
       WHERE user_id = ? AND otp_code = ? AND otp_purpose = 'password_reset' AND is_used = false AND expires_at > NOW()
       ORDER BY otp_id DESC LIMIT 1`,
      [userId, otp_code.trim()]
    );

    if (otpRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset OTP code' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(new_password, 10);

    // Update password
    await db.query(`UPDATE users SET password_hash = ? WHERE user_id = ?`, [newHash, userId]);

    // Mark OTP used
    await db.query(`UPDATE password_reset_otp SET is_used = true WHERE otp_id = ?`, [otpRows[0].otp_id]);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  verifyOtp,
  login,
  forgotPassword,
  resetPassword
};
