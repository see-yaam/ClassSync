const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api', require('./routes/notificationRoutes'));
app.use('/api', require('./routes/classroomRoutes'));
app.use('/api', require('./routes/homeworkRoutes'));
app.use('/api', require('./routes/problemRoutes'));
app.use('/api', require('./routes/submissionRoutes'));
app.use('/api', require('./routes/gradeRoutes'));
app.use('/api', require('./routes/analyticsRoutes'));
app.use('/api', require('./routes/liveSessionRoutes'));
app.use('/api', require('./routes/resourceRoutes'));
app.use('/api', require('./routes/alertRoutes'));
app.use('/api', require('./routes/plagiarismRoutes'));
app.use('/api', require('./routes/uploadRoutes'));
app.use('/api', require('./routes/messageRoutes'));
app.use('/api', require('./routes/autoEvalRoutes'));
app.use('/api', require('./routes/cronRoutes'));

// Fallback to login.html if not authenticated, or index.html for static routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Export app for Vercel serverless functions
module.exports = app;

// --- Only run background tasks & listen when running locally (not on Vercel) ---
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

if (!isVercel) {
  const db = require('./config/db');
  const { createNotification } = require('./utils/notificationHelper');

  // Background interval runner: Check approaching homework deadlines every 5 minutes
  const checkApproachingDeadlines = async () => {
    try {
      const [upcoming] = await db.query(
        `SELECT homework_id, classroom_id, title, deadline
         FROM homework
         WHERE deadline_reminder_sent = false
           AND is_published = true
           AND deadline IS NOT NULL
           AND deadline BETWEEN NOW() AND NOW() + INTERVAL 1 HOUR`
      );

      for (const hw of upcoming) {
        const [members] = await db.query(
          `SELECT user_id FROM classroom_members WHERE classroom_id = ? AND role = 'learner' AND is_active = true`,
          [hw.classroom_id]
        );

        for (const m of members) {
          await createNotification(
            m.user_id,
            'deadline',
            'Upcoming Homework Deadline Warning',
            `Deadline approaching in < 1 hour for "${hw.title}". Please submit your solution soon!`,
            `/homework.html?id=${hw.homework_id}`
          );
        }

        await db.query(
          `UPDATE homework SET deadline_reminder_sent = true WHERE homework_id = ?`,
          [hw.homework_id]
        );
      }
    } catch (error) {
      console.error('Error in deadline background runner:', error);
    }
  };

  const fs = require('fs');

  // Automatic DB Schema Initializer (Runs on startup if database is empty)
  const autoInitSchema = async () => {
    try {
      const [tables] = await db.query(`SHOW TABLES LIKE 'users'`);
      if (tables.length === 0) {
        console.log('⚡ Table "users" not found in database. Auto-initializing schema.sql...');
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        const statements = schemaSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of statements) {
          try {
            await db.query(statement);
          } catch (sErr) {
            // Ignore individual statement warnings
          }
        }
        console.log('✅ DATABASE TABLES AUTOMATICALLY CREATED & INITIALIZED!');
      } else {
        console.log('✔ Database tables verified.');
      }
    } catch (err) {
      console.warn('Auto schema init check:', err.message);
    }
  };

  autoInitSchema();

  const { startScheduledSessionChecker } = require('./utils/scheduledSessionChecker');
  startScheduledSessionChecker();

  // Start Server
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 ClassSync Server running at http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}
