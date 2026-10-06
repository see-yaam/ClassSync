const db = require('../config/db');

// GET /api/dashboard/summary
const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // 1. Check user roles across classrooms
    const [createdRooms] = await db.query(
      `SELECT classroom_id FROM classrooms WHERE creator_id = ? AND is_active = true`,
      [userId]
    );

    const [staffMemberships] = await db.query(
      `SELECT classroom_id FROM classroom_members WHERE user_id = ? AND role IN ('instructor', 'TA') AND is_active = true`,
      [userId]
    );

    const isInstructor = createdRooms.length > 0 || staffMemberships.length > 0;

    // --- Learner Data Retrieval ---
    let learnerData = {
      enrolled_classrooms_count: 0,
      upcoming_homeworks_count: 0,
      submitted_count: 0,
      avg_grade: null,
      enrolled_classrooms: [],
      upcoming_homeworks: [],
      recent_submissions: []
    };

    try {
      const [enrolled] = await db.query(
        `SELECT c.classroom_id, c.room_number, c.classroom_name, c.description, c.cover_photo_url,
                u.full_name AS instructor_name
         FROM classroom_members cm
         JOIN classrooms c ON cm.classroom_id = c.classroom_id
         JOIN users u ON c.creator_id = u.user_id
         WHERE cm.user_id = ? AND cm.role = 'learner' AND cm.is_active = true AND c.is_active = true
         ORDER BY cm.joined_at DESC`,
        [userId]
      );
      learnerData.enrolled_classrooms = enrolled || [];
      learnerData.enrolled_classrooms_count = enrolled.length;

      const [upcoming] = await db.query(
        `SELECT h.homework_id, h.title, h.deadline, h.total_points, c.classroom_id, c.classroom_name, c.room_number,
                TIMESTAMPDIFF(SECOND, NOW(), h.deadline) AS seconds_remaining
         FROM homework h
         JOIN classrooms c ON h.classroom_id = c.classroom_id
         JOIN classroom_members cm ON c.classroom_id = cm.classroom_id
         WHERE cm.user_id = ? AND cm.role = 'learner' AND cm.is_active = true 
           AND h.is_published = true AND h.is_active = true
           AND (h.deadline IS NULL OR h.deadline > NOW())
           AND NOT EXISTS (
             SELECT 1 FROM questions q
             JOIN submissions s ON q.question_id = s.question_id
             WHERE q.homework_id = h.homework_id AND s.learner_id = ?
           )
         ORDER BY (h.deadline IS NULL), h.deadline ASC
         LIMIT 6`,
        [userId, userId]
      );
      learnerData.upcoming_homeworks = upcoming || [];
      learnerData.upcoming_homeworks_count = upcoming.length;

      const [submissions] = await db.query(
        `SELECT s.submission_id, s.submitted_at, s.is_late, q.points AS max_points, h.title AS homework_title, h.homework_id,
                c.classroom_name, g.score, g.feedback, g.status AS grade_status
         FROM submissions s
         JOIN questions q ON s.question_id = q.question_id
         JOIN homework h ON q.homework_id = h.homework_id
         JOIN classrooms c ON h.classroom_id = c.classroom_id
         LEFT JOIN grades g ON s.submission_id = g.submission_id
         WHERE s.learner_id = ?
         ORDER BY s.submitted_at DESC
         LIMIT 6`,
        [userId]
      );
      learnerData.recent_submissions = submissions || [];

      const [subStats] = await db.query(
        `SELECT COUNT(*) AS total_submissions,
                AVG(CASE WHEN g.score IS NOT NULL AND q.points > 0 THEN (g.score / q.points) * 100 ELSE NULL END) AS avg_score_pct
         FROM submissions s
         JOIN questions q ON s.question_id = q.question_id
         LEFT JOIN grades g ON s.submission_id = g.submission_id
         WHERE s.learner_id = ?`,
        [userId]
      );
      if (subStats && subStats.length > 0) {
        learnerData.submitted_count = subStats[0].total_submissions || 0;
        learnerData.avg_grade = subStats[0].avg_score_pct !== null ? Math.round(subStats[0].avg_score_pct * 10) / 10 : null;
      }
    } catch (lErr) {
      console.warn('Dashboard Learner query warning:', lErr.message);
    }

    // --- Instructor / Staff Data Retrieval ---
    let instructorData = {
      managed_classrooms_count: 0,
      total_students_count: 0,
      pending_grading_count: 0,
      active_live_sessions_count: 0,
      managed_classrooms: [],
      pending_submissions: [],
      active_sessions: [],
      at_risk_alerts: []
    };

    if (isInstructor) {
      try {
        const [managed] = await db.query(
          `SELECT c.classroom_id, c.room_number, c.classroom_name, c.cover_photo_url, c.created_at,
                  (SELECT COUNT(*) FROM classroom_members cm WHERE cm.classroom_id = c.classroom_id AND cm.role = 'learner' AND cm.is_active = true) AS student_count,
                  (SELECT COUNT(*) FROM homework h WHERE h.classroom_id = c.classroom_id AND h.is_active = true) AS homework_count
           FROM classrooms c
           LEFT JOIN classroom_members cm ON c.classroom_id = cm.classroom_id AND cm.user_id = ? AND cm.role IN ('instructor', 'TA')
           WHERE (c.creator_id = ? OR cm.user_id IS NOT NULL) AND c.is_active = true
           GROUP BY c.classroom_id
           ORDER BY c.created_at DESC`,
          [userId, userId]
        );
        instructorData.managed_classrooms = managed || [];
        instructorData.managed_classrooms_count = managed.length;

        // Total unique students across all managed classrooms
        const [totStudents] = await db.query(
          `SELECT COUNT(DISTINCT cm.user_id) AS total_students
           FROM classroom_members cm
           JOIN classrooms c ON cm.classroom_id = c.classroom_id
           LEFT JOIN classroom_members staff ON c.classroom_id = staff.classroom_id AND staff.user_id = ? AND staff.role IN ('instructor','TA')
           WHERE cm.role = 'learner' AND cm.is_active = true AND (c.creator_id = ? OR staff.user_id IS NOT NULL)`,
          [userId, userId]
        );
        if (totStudents && totStudents.length > 0) {
          instructorData.total_students_count = totStudents[0].total_students || 0;
        }

        const [pending] = await db.query(
          `SELECT s.submission_id, s.submitted_at, u.full_name AS student_name, u.user_id AS student_id,
                  h.title AS homework_title, h.homework_id, c.classroom_name, c.classroom_id
           FROM submissions s
           JOIN users u ON s.learner_id = u.user_id
           JOIN questions q ON s.question_id = q.question_id
           JOIN homework h ON q.homework_id = h.homework_id
           JOIN classrooms c ON h.classroom_id = c.classroom_id
           LEFT JOIN grades g ON s.submission_id = g.submission_id
           LEFT JOIN classroom_members staff ON c.classroom_id = staff.classroom_id AND staff.user_id = ? AND staff.role IN ('instructor','TA')
           WHERE (c.creator_id = ? OR staff.user_id IS NOT NULL)
             AND g.grade_id IS NULL
           ORDER BY s.submitted_at ASC
           LIMIT 10`,
          [userId, userId]
        );
        instructorData.pending_submissions = pending || [];
        instructorData.pending_grading_count = pending.length;

        const [sessions] = await db.query(
          `SELECT ls.session_id, ls.session_title, ls.scheduled_time, ls.jitsi_room_id, ls.is_active, c.classroom_name, c.classroom_id
           FROM live_sessions ls
           JOIN classrooms c ON ls.classroom_id = c.classroom_id
           LEFT JOIN classroom_members staff ON c.classroom_id = staff.classroom_id AND staff.user_id = ? AND staff.role IN ('instructor','TA')
           WHERE (c.creator_id = ? OR staff.user_id IS NOT NULL)
             AND ls.is_active = true AND ls.ended_at IS NULL
           ORDER BY ls.scheduled_time ASC
           LIMIT 5`,
          [userId, userId]
        );
        instructorData.active_sessions = sessions || [];
        instructorData.active_live_sessions_count = sessions.length;

        const [alerts] = await db.query(
          `SELECT la.alert_id, la.alert_type, la.alert_message, la.created_at, u.full_name AS student_name, c.classroom_name
           FROM learner_alerts la
           JOIN users u ON la.learner_id = u.user_id
           JOIN classrooms c ON la.classroom_id = c.classroom_id
           WHERE la.is_resolved = false
             AND (c.creator_id = ? OR la.instructor_id = ?)
           ORDER BY la.created_at DESC
           LIMIT 5`,
          [userId, userId]
        );
        instructorData.at_risk_alerts = alerts || [];
      } catch (iErr) {
        console.warn('Dashboard Instructor query warning:', iErr.message);
      }
    }

    res.json({
      success: true,
      user: {
        user_id: req.user.user_id,
        full_name: req.user.full_name,
        email: req.user.email,
        profile_picture_url: req.user.profile_picture_url
      },
      is_instructor: isInstructor,
      learner: learnerData,
      instructor: instructorData
    });

  } catch (error) {
    console.error('getDashboardSummary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary.' });
  }
};

// Helper to check and issue notifications for due personal tasks
const checkTodoReminders = async (userId) => {
  try {
    const { createNotification } = require('../utils/notificationHelper');
    const [dueTodos] = await db.query(
      `SELECT todo_id, title, due_date, due_time
       FROM user_todos
       WHERE user_id = ? AND completed = false AND reminder_sent = false
         AND due_date IS NOT NULL AND due_time IS NOT NULL
         AND (due_date < CURDATE() OR (due_date = CURDATE() AND due_time <= CURTIME()))`,
      [userId]
    );

    for (const t of dueTodos) {
      const timeStr = t.due_time ? String(t.due_time).substring(0, 5) : '';
      const dateStr = t.due_date ? String(t.due_date).split('T')[0] : '';
      await createNotification(
        userId,
        'todo_reminder',
        '⏰ Personal Task Reminder',
        `Reminder: Task "${t.title}" is due now (${timeStr} on ${dateStr})!`,
        '/dashboard.html'
      );
      await db.query(`UPDATE user_todos SET reminder_sent = true WHERE todo_id = ?`, [t.todo_id]);
    }
  } catch (err) {
    console.warn('checkTodoReminders error:', err.message);
  }
};

// GET /api/dashboard/todos
const getTodos = async (req, res) => {
  try {
    const userId = req.user.user_id;

    await checkTodoReminders(userId);

    const [rows] = await db.query(
      `SELECT todo_id, title, priority, due_date, due_time, completed, reminder_sent, created_at
       FROM user_todos
       WHERE user_id = ?
       ORDER BY completed ASC, due_date ASC, due_time ASC, created_at DESC`,
      [userId]
    );
    res.json({ success: true, todos: rows || [] });
  } catch (error) {
    console.error('getTodos error:', error);
    res.status(500).json({ success: false, message: 'Failed to load to-do list.' });
  }
};

// POST /api/dashboard/todos
const createTodo = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { title, priority = 'medium', due_date = null, due_time = null } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    const [result] = await db.query(
      `INSERT INTO user_todos (user_id, title, priority, due_date, due_time) VALUES (?, ?, ?, ?, ?)`,
      [userId, title.trim(), priority, due_date || null, due_time || null]
    );

    res.status(201).json({
      success: true,
      message: 'Task added successfully',
      todo: {
        todo_id: result.insertId,
        title: title.trim(),
        priority,
        due_date: due_date || null,
        due_time: due_time || null,
        completed: false
      }
    });
  } catch (error) {
    console.error('createTodo error:', error);
    res.status(500).json({ success: false, message: 'Failed to add task.' });
  }
};

// PUT /api/dashboard/todos/:id
const updateTodo = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const todoId = parseInt(req.params.id, 10);
    const { title, priority, due_date, completed } = req.body;

    const [existing] = await db.query(
      `SELECT todo_id FROM user_todos WHERE todo_id = ? AND user_id = ?`,
      [todoId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title.trim());
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date || null);
    }
    if (completed !== undefined) {
      updates.push('completed = ?');
      values.push(Boolean(completed));
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: 'No fields to update.' });
    }

    values.push(todoId, userId);
    await db.query(
      `UPDATE user_todos SET ${updates.join(', ')} WHERE todo_id = ? AND user_id = ?`,
      values
    );

    res.json({ success: true, message: 'Task updated successfully.' });
  } catch (error) {
    console.error('updateTodo error:', error);
    res.status(500).json({ success: false, message: 'Failed to update task.' });
  }
};

// DELETE /api/dashboard/todos/:id
const deleteTodo = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const todoId = parseInt(req.params.id, 10);

    const [result] = await db.query(
      `DELETE FROM user_todos WHERE todo_id = ? AND user_id = ?`,
      [todoId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('deleteTodo error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete task.' });
  }
};

// GET /api/dashboard/calendar-events?month=10&year=2026
const getCalendarEvents = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31 23:59:59`;

    // 1. Homework Deadlines
    const [homeworks] = await db.query(
      `SELECT DISTINCT h.homework_id, h.title, h.deadline, h.total_points, c.classroom_name, c.classroom_id
       FROM homework h
       JOIN classrooms c ON h.classroom_id = c.classroom_id
       JOIN classroom_members cm ON c.classroom_id = cm.classroom_id
       WHERE cm.user_id = ? AND cm.is_active = true AND h.is_published = true AND h.is_active = true
         AND h.deadline IS NOT NULL
         AND h.deadline BETWEEN ? AND ?`,
      [userId, startDate, endDate]
    );

    // 2. Scheduled Live Sessions
    const [liveSessions] = await db.query(
      `SELECT DISTINCT ls.session_id, ls.session_title, ls.scheduled_time, ls.jitsi_room_id, ls.is_active, c.classroom_name, c.classroom_id
       FROM live_sessions ls
       JOIN classrooms c ON ls.classroom_id = c.classroom_id
       JOIN classroom_members cm ON c.classroom_id = cm.classroom_id
       WHERE cm.user_id = ? AND cm.is_active = true AND ls.is_active = true
         AND ls.scheduled_time IS NOT NULL
         AND ls.scheduled_time BETWEEN ? AND ?`,
      [userId, startDate, endDate]
    );

    // 3. Personal Tasks
    const [todos] = await db.query(
      `SELECT todo_id, title, priority, due_date, due_time, completed
       FROM user_todos
       WHERE user_id = ? AND due_date IS NOT NULL
         AND due_date BETWEEN ? AND ?`,
      [userId, startDate, endDate]
    );

    // 4. Quizzes / Exams
    const [quizzes] = await db.query(
      `SELECT DISTINCT q.quiz_id, q.title, q.quiz_type, q.duration_minutes, q.start_time, q.end_time, c.classroom_name, c.classroom_id
       FROM quizzes q
       JOIN classrooms c ON q.classroom_id = c.classroom_id
       JOIN classroom_members cm ON c.classroom_id = cm.classroom_id
       WHERE cm.user_id = ? AND cm.is_active = true AND q.is_published = true
         AND (
           (q.start_time IS NOT NULL AND q.start_time BETWEEN ? AND ?)
           OR (q.end_time IS NOT NULL AND q.end_time BETWEEN ? AND ?)
         )`,
      [userId, startDate, endDate, startDate, endDate]
    );

    const events = [];

    homeworks.forEach(hw => {
      const dateStr = String(hw.deadline).split('T')[0].split(' ')[0];
      events.push({
        id: `hw-${hw.homework_id}`,
        type: 'homework',
        title: hw.title,
        date: dateStr,
        datetime: hw.deadline,
        classroom: hw.classroom_name,
        url: `/homework.html?id=${hw.homework_id}`,
        points: hw.total_points
      });
    });

    liveSessions.forEach(ls => {
      const dateStr = String(ls.scheduled_time).split('T')[0].split(' ')[0];
      events.push({
        id: `live-${ls.session_id}`,
        type: 'live_session',
        title: ls.session_title,
        date: dateStr,
        datetime: ls.scheduled_time,
        classroom: ls.classroom_name,
        url: `/live.html?id=${ls.session_id}&room=${encodeURIComponent(ls.jitsi_room_id)}`,
        is_active: ls.is_active
      });
    });

    todos.forEach(t => {
      const dateStr = String(t.due_date).split('T')[0].split(' ')[0];
      events.push({
        id: `todo-${t.todo_id}`,
        type: 'todo',
        title: t.title,
        date: dateStr,
        due_time: t.due_time ? String(t.due_time).substring(0, 5) : null,
        priority: t.priority,
        completed: Boolean(t.completed)
      });
    });

    quizzes.forEach(q => {
      const targetTime = q.start_time || q.end_time;
      if (targetTime) {
        const dateStr = String(targetTime).split('T')[0].split(' ')[0];
        events.push({
          id: `quiz-${q.quiz_id}`,
          type: 'quiz',
          title: q.title,
          date: dateStr,
          datetime: targetTime,
          quiz_type: q.quiz_type,
          duration_minutes: q.duration_minutes,
          classroom: q.classroom_name,
          url: `/dashboard.html?tab=quizzes&id=${q.quiz_id}`
        });
      }
    });

    res.json({ success: true, year, month, events });
  } catch (error) {
    console.error('getCalendarEvents error:', error);
    res.status(500).json({ success: false, message: 'Failed to load calendar events.' });
  }
};

// GET /api/dashboard/calendar/export
const exportCalendarICal = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Fetch homework deadlines
    const [homeworks] = await db.query(
      `SELECT h.homework_id, h.title, h.deadline, c.classroom_name
       FROM homework h
       JOIN classrooms c ON h.classroom_id = c.classroom_id
       JOIN classroom_members cm ON c.classroom_id = cm.classroom_id
       WHERE cm.user_id = ? AND cm.is_active = true AND h.is_published = true AND h.is_active = true
         AND h.deadline IS NOT NULL`,
      [userId]
    );

    // Fetch live sessions
    const [liveSessions] = await db.query(
      `SELECT DISTINCT ls.session_id, ls.session_title, ls.scheduled_time, c.classroom_name
       FROM live_sessions ls
       JOIN classrooms c ON ls.classroom_id = c.classroom_id
       JOIN classroom_members cm ON c.classroom_id = cm.classroom_id
       WHERE cm.user_id = ? AND cm.is_active = true AND ls.is_active = true
         AND ls.scheduled_time IS NOT NULL`,
      [userId]
    );

    const formatICalDate = (dt) => {
      if (!dt) return '';
      const d = new Date(dt);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ClassSync Academic Classroom Platform//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:ClassSync Schedule'
    ];

    homeworks.forEach(hw => {
      const dtStr = formatICalDate(hw.deadline);
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:hw-${hw.homework_id}@classsync.app`,
        `DTSTAMP:${formatICalDate(new Date())}`,
        `DTSTART:${dtStr}`,
        `SUMMARY:[Homework] ${hw.title} - ${hw.classroom_name}`,
        `DESCRIPTION:Homework Deadline for ${hw.classroom_name}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    liveSessions.forEach(ls => {
      const dtStr = formatICalDate(ls.scheduled_time);
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:live-${ls.session_id}@classsync.app`,
        `DTSTAMP:${formatICalDate(new Date())}`,
        `DTSTART:${dtStr}`,
        `SUMMARY:[Live Class] ${ls.session_title} - ${ls.classroom_name}`,
        `DESCRIPTION:Scheduled Live Video Session for ${ls.classroom_name}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const fileBuffer = Buffer.from(icsContent.join('\r\n'), 'utf-8');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ClassSync_Schedule.ics"');
    res.send(fileBuffer);
  } catch (error) {
    console.error('exportCalendarICal error:', error);
    res.status(500).json({ success: false, message: 'Failed to export calendar schedule.' });
  }
};

module.exports = {
  getDashboardSummary,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  getCalendarEvents,
  exportCalendarICal
};
