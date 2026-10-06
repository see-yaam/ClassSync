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
app.use('/api', require('./routes/dashboardRoutes'));
app.use('/api', require('./routes/cronRoutes'));
app.use('/api', require('./routes/quizRoutes'));

// Fallback to login.html if not authenticated, or index.html for static routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const db = require('./config/db');
const fs = require('fs');

// Automatic DB Schema Initializer & Column Migration Check (Runs on startup)
let schemaInitialized = false;
const autoInitSchema = async () => {
  if (schemaInitialized) return;
  schemaInitialized = true;
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
      // Ensure user profile extension columns exist
      const columnsToAdd = [
        { name: 'bio', type: 'TEXT NULL' },
        { name: 'github_link', type: 'VARCHAR(255) NULL' },
        { name: 'linkedin_link', type: 'VARCHAR(255) NULL' },
        { name: 'website_link', type: 'VARCHAR(255) NULL' }
      ];
      const [existingCols] = await db.query(`SHOW COLUMNS FROM users`);
      const colNames = existingCols.map(c => c.Field);
      for (const col of columnsToAdd) {
        if (!colNames.includes(col.name)) {
          try {
            await db.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
            console.log(`✅ Added missing column "${col.name}" to users table.`);
          } catch (colErr) {
            console.warn(`Could not add column ${col.name}:`, colErr.message);
          }
        }
      }
      try {
        await db.query(`ALTER TABLE password_reset_otp MODIFY COLUMN otp_purpose VARCHAR(50) NOT NULL DEFAULT 'password_reset'`);
        await db.query(`ALTER TABLE users MODIFY COLUMN profile_picture_url MEDIUMTEXT`);
      } catch (mErr) {
        // Ignore if already modified
      }

      // Check if user_todos table exists & has due_time column
      try {
        const [todosTable] = await db.query(`SHOW TABLES LIKE 'user_todos'`);
        if (todosTable.length === 0) {
          await db.query(`
            CREATE TABLE \`user_todos\` (
              \`todo_id\` int PRIMARY KEY AUTO_INCREMENT,
              \`user_id\` int NOT NULL,
              \`title\` varchar(255) NOT NULL,
              \`priority\` enum('low','medium','high') NOT NULL DEFAULT 'medium',
              \`due_date\` date NULL,
              \`due_time\` time NULL,
              \`completed\` boolean DEFAULT false,
              \`reminder_sent\` boolean DEFAULT false,
              \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE
            )
          `);
          console.log('✅ Created "user_todos" table automatically.');
        } else {
          try {
            await db.query(`ALTER TABLE user_todos ADD COLUMN due_time TIME NULL AFTER due_date`);
          } catch (e) {}
          try {
            await db.query(`ALTER TABLE user_todos ADD COLUMN reminder_sent BOOLEAN DEFAULT false AFTER completed`);
          } catch (e) {}
        }
      } catch (tErr) {
        console.warn('user_todos check warning:', tErr.message);
      }

      // Check and auto-create quiz tables if missing
      try {
        const [quizTable] = await db.query(`SHOW TABLES LIKE 'quizzes'`);
        if (quizTable.length === 0) {
          await db.query(`
            CREATE TABLE \`quizzes\` (
              \`quiz_id\` int PRIMARY KEY AUTO_INCREMENT,
              \`classroom_id\` int NOT NULL,
              \`created_by\` int NOT NULL,
              \`title\` varchar(255) NOT NULL,
              \`description\` text NULL,
              \`quiz_type\` enum('live','flexible') NOT NULL DEFAULT 'flexible',
              \`duration_minutes\` int NOT NULL DEFAULT 15,
              \`start_time\` datetime NULL,
              \`end_time\` datetime NULL,
              \`total_marks\` int DEFAULT 0,
              \`is_published\` boolean DEFAULT true,
              \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (\`classroom_id\`) REFERENCES \`classrooms\` (\`classroom_id\`) ON DELETE CASCADE,
              FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE
            )
          `);
          await db.query(`
            CREATE TABLE \`quiz_questions\` (
              \`question_id\` int PRIMARY KEY AUTO_INCREMENT,
              \`quiz_id\` int NOT NULL,
              \`question_text\` text NOT NULL,
              \`question_type\` enum('mcq','true_false','short_answer') NOT NULL DEFAULT 'mcq',
              \`points\` int DEFAULT 5,
              \`order_number\` int DEFAULT 0,
              \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (\`quiz_id\`) REFERENCES \`quizzes\` (\`quiz_id\`) ON DELETE CASCADE
            )
          `);
          await db.query(`
            CREATE TABLE \`quiz_options\` (
              \`option_id\` int PRIMARY KEY AUTO_INCREMENT,
              \`question_id\` int NOT NULL,
              \`option_text\` varchar(500) NOT NULL,
              \`is_correct\` boolean DEFAULT false,
              FOREIGN KEY (\`question_id\`) REFERENCES \`quiz_questions\` (\`question_id\`) ON DELETE CASCADE
            )
          `);
          await db.query(`
            CREATE TABLE \`quiz_attempts\` (
              \`attempt_id\` int PRIMARY KEY AUTO_INCREMENT,
              \`quiz_id\` int NOT NULL,
              \`learner_id\` int NOT NULL,
              \`started_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
              \`submitted_at\` timestamp NULL,
              \`status\` enum('in_progress','submitted','time_expired') DEFAULT 'in_progress',
              \`total_score\` decimal(5,2) DEFAULT 0.00,
              FOREIGN KEY (\`quiz_id\`) REFERENCES \`quizzes\` (\`quiz_id\`) ON DELETE CASCADE,
              FOREIGN KEY (\`learner_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE
            )
          `);
          await db.query(`
            CREATE TABLE \`quiz_answers\` (
              \`answer_id\` int PRIMARY KEY AUTO_INCREMENT,
              \`attempt_id\` int NOT NULL,
              \`question_id\` int NOT NULL,
              \`selected_option_id\` int NULL,
              \`answer_text\` text NULL,
              \`is_correct\` boolean NULL,
              \`marks_awarded\` decimal(5,2) DEFAULT 0.00,
              FOREIGN KEY (\`attempt_id\`) REFERENCES \`quiz_attempts\` (\`attempt_id\`) ON DELETE CASCADE,
              FOREIGN KEY (\`question_id\`) REFERENCES \`quiz_questions\` (\`question_id\`) ON DELETE CASCADE,
              FOREIGN KEY (\`selected_option_id\`) REFERENCES \`quiz_options\` (\`option_id\`) ON DELETE SET NULL
            )
          `);
          await db.query(`
            CREATE TABLE \`quiz_test_cases\` (
              \`test_case_id\` int PRIMARY KEY AUTO_INCREMENT,
              \`question_id\` int NOT NULL,
              \`input_data\` text NULL,
              \`expected_output\` text NOT NULL,
              \`points\` int DEFAULT 1,
              FOREIGN KEY (\`question_id\`) REFERENCES \`quiz_questions\` (\`question_id\`) ON DELETE CASCADE
            )
          `);
          console.log('✅ Created "quizzes", "quiz_questions", "quiz_options", "quiz_attempts", "quiz_answers", "quiz_test_cases" tables automatically.');
        } else {
          try {
            await db.query(`ALTER TABLE quiz_questions MODIFY COLUMN question_type ENUM('mcq','true_false','short_answer','coding') NOT NULL DEFAULT 'mcq'`);
          } catch(e){}
          try {
            await db.query(`ALTER TABLE quiz_questions ADD COLUMN coding_language VARCHAR(50) DEFAULT 'python' AFTER question_type`);
          } catch(e){}
          try {
            await db.query(`ALTER TABLE quiz_questions ADD COLUMN starter_code TEXT NULL AFTER coding_language`);
          } catch(e){}
          try {
            await db.query(`ALTER TABLE quiz_attempts ADD COLUMN approval_status ENUM('approved','pending') DEFAULT 'approved' AFTER status`);
          } catch(e){}
          try {
            await db.query(`
              CREATE TABLE IF NOT EXISTS \`quiz_test_cases\` (
                \`test_case_id\` int PRIMARY KEY AUTO_INCREMENT,
                \`question_id\` int NOT NULL,
                \`input_data\` text NULL,
                \`expected_output\` text NOT NULL,
                \`points\` int DEFAULT 1,
                FOREIGN KEY (\`question_id\`) REFERENCES \`quiz_questions\` (\`question_id\`) ON DELETE CASCADE
              )
            `);
          } catch(e){}
          try {
            await db.query(`ALTER TABLE quiz_answers ADD COLUMN coding_language VARCHAR(50) NULL AFTER answer_text`);
          } catch(e){}
          try {
            await db.query(`ALTER TABLE quiz_test_cases ADD COLUMN is_hidden BOOLEAN DEFAULT false AFTER expected_output`);
          } catch(e){}
        }
      } catch (qErr) {
        console.warn('Quiz tables check warning:', qErr.message);
      }
    }
  } catch (err) {
    console.warn('Auto schema init check:', err.message);
  }
};

autoInitSchema();

// Export app for Vercel serverless functions
module.exports = app;

// --- Only run background tasks & listen when running locally (not on Vercel) ---
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

if (!isVercel) {
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

  const { startScheduledSessionChecker } = require('./utils/scheduledSessionChecker');
  startScheduledSessionChecker();

  // Start Server
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 ClassSync Server running at http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}
