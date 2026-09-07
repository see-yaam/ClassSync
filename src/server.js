const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api', require('./routes/notificationRoutes'));
app.use('/api/classrooms', require('./routes/classroomRoutes'));
app.use('/api', require('./routes/homeworkRoutes'));
app.use('/api', require('./routes/problemRoutes'));
app.use('/api', require('./routes/submissionRoutes'));
app.use('/api', require('./routes/gradeRoutes'));
app.use('/api', require('./routes/analyticsRoutes'));
app.use('/api', require('./routes/liveSessionRoutes'));
app.use('/api', require('./routes/resourceRoutes'));
app.use('/api', require('./routes/alertRoutes'));
app.use('/api', require('./routes/plagiarismRoutes'));

// Fallback to index.html for unknown static routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 ClassSync Server running at http://localhost:${PORT}`);
  console.log(`====================================================`);
});
