const db = require('../config/db');

// --- Learner Dashboard Analytics & Activity ---
const getLearnerDashboard = async (req, res) => {
  const userId = req.user.user_id;

  try {
    // 1. Enrolled Classrooms
    const [enrolledClassrooms] = await db.query(
      `SELECT c.classroom_id, c.classroom_name, c.room_number, c.description, c.is_paid, c.price, u.full_name AS instructor_name, cm.joined_at
       FROM classroom_members cm
       JOIN classrooms c ON cm.classroom_id = c.classroom_id
       LEFT JOIN users u ON c.creator_id = u.user_id
       WHERE cm.user_id = ? AND cm.role = 'learner' AND cm.is_active = true
       ORDER BY cm.joined_at DESC`,
      [userId]
    );

    // 2. Submissions Matrix with Scores and Feedback
    const [submissions] = await db.query(
      `SELECT 
         s.submission_id, s.submitted_at, s.auto_eval_status AS submission_status,
         q.question_id, q.question_text, q.points AS max_points,
         h.homework_id, h.title AS homework_title, h.deadline,
         c.classroom_id, c.classroom_name,
         g.score, g.feedback, g.graded_at,
         u_inst.full_name AS graded_by_name
       FROM submissions s
       JOIN questions q ON s.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
       JOIN classrooms c ON h.classroom_id = c.classroom_id
       LEFT JOIN grades g ON s.submission_id = g.submission_id
       LEFT JOIN users u_inst ON g.instructor_id = u_inst.user_id
       WHERE s.learner_id = ?
       ORDER BY s.submitted_at DESC`,
      [userId]
    );

    // 3. Warnings and Alerts Issued
    const [alerts] = await db.query(
      `SELECT la.alert_id, la.alert_type, la.alert_message, la.is_resolved, la.created_at,
              c.classroom_name, u.full_name AS instructor_name
       FROM learner_alerts la
       JOIN classrooms c ON la.classroom_id = c.classroom_id
       JOIN users u ON la.instructor_id = u.user_id
       WHERE la.learner_id = ?
       ORDER BY la.created_at DESC`,
      [userId]
    );

    // 4. Upcoming Deadlines for enrolled courses
    const [upcomingDeadlines] = await db.query(
      `SELECT h.homework_id, h.title, h.deadline, h.total_points AS max_score, c.classroom_name, c.classroom_id
       FROM homework h
       JOIN classrooms c ON h.classroom_id = c.classroom_id
       JOIN classroom_members cm ON c.classroom_id = cm.classroom_id
       WHERE cm.user_id = ? AND cm.role = 'learner' AND cm.is_active = true
         AND h.is_published = true AND h.deadline >= NOW()
       ORDER BY h.deadline ASC
       LIMIT 5`,
      [userId]
    );

    // Calculate Summary Stats
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.score !== null && s.score !== undefined);
    const totalScoreAchieved = gradedSubmissions.reduce((acc, curr) => acc + Number(curr.score || 0), 0);
    const totalMaxPossible = gradedSubmissions.reduce((acc, curr) => acc + Number(curr.max_points || 0), 0);
    const avgScorePercent = totalMaxPossible > 0 ? Math.round((totalScoreAchieved / totalMaxPossible) * 100) : 0;
    const activeWarningsCount = alerts.filter(a => !a.is_resolved).length;

    res.json({
      success: true,
      stats: {
        enrolledCount: enrolledClassrooms.length,
        totalSubmissions,
        avgScorePercent,
        activeWarningsCount
      },
      enrolledClassrooms,
      submissions,
      alerts,
      upcomingDeadlines
    });
  } catch (error) {
    console.error('Error fetching learner dashboard:', error);
    res.status(500).json({ success: false, message: 'Server error fetching learner dashboard' });
  }
};

// --- Instructor Dashboard Analytics & Activity ---
const getInstructorDashboard = async (req, res) => {
  const userId = req.user.user_id;

  try {
    // 1. Created / Taught Classrooms
    const [createdClassrooms] = await db.query(
      `SELECT c.classroom_id, c.classroom_name, c.room_number, c.description, c.created_at,
              (SELECT COUNT(*) FROM classroom_members cm WHERE cm.classroom_id = c.classroom_id AND cm.role = 'learner' AND cm.is_active = true) AS student_count
       FROM classrooms c
       WHERE c.creator_id = ?
          OR c.classroom_id IN (SELECT classroom_id FROM classroom_members WHERE user_id = ? AND role = 'instructor' AND is_active = true)
       ORDER BY c.created_at DESC`,
      [userId, userId]
    );

    const classroomIds = createdClassrooms.map(c => c.classroom_id);

    let pendingGradingQueue = [];
    let plagiarismOverview = [];
    let pendingRequests = [];

    if (classroomIds.length > 0) {
      const placeholders = classroomIds.map(() => '?').join(',');

      // 2. Master Pending Grading Queue
      const [pending] = await db.query(
        `SELECT 
           s.submission_id, s.submitted_at, s.auto_eval_status,
           q.question_id, q.question_text, q.points AS max_points,
           h.homework_id, h.title AS homework_title,
           c.classroom_id, c.classroom_name,
           u.user_id AS learner_id, u.full_name AS learner_name, u.email AS learner_email
         FROM submissions s
         JOIN questions q ON s.question_id = q.question_id
         JOIN homework h ON q.homework_id = h.homework_id
         JOIN classrooms c ON h.classroom_id = c.classroom_id
         JOIN users u ON s.learner_id = u.user_id
         LEFT JOIN grades g ON s.submission_id = g.submission_id
         WHERE c.classroom_id IN (${placeholders}) AND g.grade_id IS NULL
         ORDER BY s.submitted_at ASC`,
        classroomIds
      );
      pendingGradingQueue = pending;

      // 3. Flagged Plagiarism Overview
      const [plagiarism] = await db.query(
        `SELECT 
           pf.flag_id, pf.similarity_score, pf.is_reviewed, pf.created_at,
           s1.submission_id AS sub1_id, u1.full_name AS student1_name,
           s2.submission_id AS sub2_id, u2.full_name AS student2_name,
           q.question_text, h.title AS homework_title, c.classroom_name
         FROM plagiarism_flags pf
         JOIN submissions s1 ON pf.submission_id_1 = s1.submission_id
         JOIN submissions s2 ON pf.submission_id_2 = s2.submission_id
         JOIN users u1 ON s1.learner_id = u1.user_id
         JOIN users u2 ON s2.learner_id = u2.user_id
         JOIN questions q ON s1.question_id = q.question_id
         JOIN homework h ON q.homework_id = h.homework_id
         JOIN classrooms c ON h.classroom_id = c.classroom_id
         WHERE c.classroom_id IN (${placeholders})
         ORDER BY pf.created_at DESC
         LIMIT 20`,
        classroomIds
      );
      plagiarismOverview = plagiarism;

      // 4. Pending Paid Enrollment Requests
      const [requests] = await db.query(
        `SELECT 
           r.request_id, r.classroom_id, r.user_id AS learner_id, r.payment_method, r.payer_phone_number, r.transaction_id, r.status, r.requested_at AS created_at,
           c.classroom_name, c.price AS amount_paid,
           u.full_name AS learner_name, u.email AS learner_email
         FROM enrollment_requests r
         JOIN classrooms c ON r.classroom_id = c.classroom_id
         JOIN users u ON r.user_id = u.user_id
         WHERE c.classroom_id IN (${placeholders}) AND r.status = 'pending'
         ORDER BY r.requested_at ASC`,
        classroomIds
      );
      pendingRequests = requests;
    }

    const totalStudents = createdClassrooms.reduce((sum, c) => sum + Number(c.student_count || 0), 0);

    res.json({
      success: true,
      stats: {
        classroomCount: createdClassrooms.length,
        totalStudents,
        pendingGradingCount: pendingGradingQueue.length,
        pendingRequestsCount: pendingRequests.length,
        unreviewedPlagiarismCount: plagiarismOverview.filter(p => !p.is_reviewed).length
      },
      createdClassrooms,
      pendingGradingQueue,
      plagiarismOverview,
      pendingRequests
    });
  } catch (error) {
    console.error('Error fetching instructor dashboard:', error);
    res.status(500).json({ success: false, message: 'Server error fetching instructor dashboard' });
  }
};

// --- Combined Calendar Events & Deadlines ---
const getCalendarEvents = async (req, res) => {
  const userId = req.user.user_id;

  try {
    // 1. Live Class Sessions for all user classrooms
    const [liveSessions] = await db.query(
      `SELECT 
         ls.session_id, ls.session_title, ls.session_description, ls.scheduled_time, ls.expected_duration,
         ls.jitsi_room_id, ls.is_active, c.classroom_id, c.classroom_name, 'live_session' AS event_type
       FROM live_sessions ls
       JOIN classrooms c ON ls.classroom_id = c.classroom_id
       JOIN classroom_members cm ON c.classroom_id = cm.classroom_id
       WHERE cm.user_id = ? AND cm.is_active = true
       ORDER BY ls.scheduled_time ASC`,
      [userId]
    );

    // 2. Homework Deadlines for all user classrooms
    const [homeworkDeadlines] = await db.query(
      `SELECT 
         h.homework_id, h.title AS homework_title, h.deadline AS scheduled_time, h.total_points AS max_score,
         c.classroom_id, c.classroom_name, 'homework' AS event_type
       FROM homework h
       JOIN classrooms c ON h.classroom_id = c.classroom_id
       JOIN classroom_members cm ON c.classroom_id = cm.classroom_id
       WHERE cm.user_id = ? AND cm.is_active = true AND h.is_published = true AND h.deadline IS NOT NULL
       ORDER BY h.deadline ASC`,
      [userId]
    );

    // 3. User Personal To-Do Items
    const [personalTodos] = await db.query(
      `SELECT 
         t.todo_id, t.title AS todo_title, t.due_date AS scheduled_time, t.priority, t.completed,
         t.classroom_id, c.classroom_name, 'todo' AS event_type
       FROM user_todos t
       LEFT JOIN classrooms c ON t.classroom_id = c.classroom_id
       WHERE t.user_id = ?
       ORDER BY t.due_date ASC, t.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      events: {
        liveSessions,
        homeworkDeadlines,
        personalTodos
      }
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ success: false, message: 'Server error fetching calendar events' });
  }
};

// --- Personal To-Do Tasks CRUD ---
const getTodos = async (req, res) => {
  const userId = req.user.user_id;
  try {
    const [todos] = await db.query(
      `SELECT t.*, c.classroom_name
       FROM user_todos t
       LEFT JOIN classrooms c ON t.classroom_id = c.classroom_id
       WHERE t.user_id = ?
       ORDER BY t.completed ASC, t.due_date ASC, t.created_at DESC`,
      [userId]
    );
    res.json({ success: true, todos });
  } catch (error) {
    console.error('Error fetching to-dos:', error);
    res.status(500).json({ success: false, message: 'Server error fetching to-dos' });
  }
};

const createTodo = async (req, res) => {
  const userId = req.user.user_id;
  const { title, classroom_id, due_date, priority } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO user_todos (user_id, classroom_id, title, due_date, priority)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        classroom_id || null,
        title.trim(),
        due_date || null,
        priority || 'medium'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'To-Do item created',
      todo: {
        todo_id: result.insertId,
        user_id: userId,
        classroom_id: classroom_id || null,
        title: title.trim(),
        due_date: due_date || null,
        priority: priority || 'medium',
        completed: false
      }
    });
  } catch (error) {
    console.error('Error creating to-do:', error);
    res.status(500).json({ success: false, message: 'Server error creating to-do' });
  }
};

const updateTodo = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { title, completed, priority, due_date, classroom_id } = req.body;

  try {
    const [existing] = await db.query(`SELECT * FROM user_todos WHERE todo_id = ? AND user_id = ?`, [id, userId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'To-Do item not found' });
    }

    const updatedTitle = title !== undefined ? title.trim() : existing[0].title;
    const updatedCompleted = completed !== undefined ? (completed ? 1 : 0) : existing[0].completed;
    const updatedPriority = priority || existing[0].priority;
    const updatedDueDate = due_date !== undefined ? (due_date || null) : existing[0].due_date;
    const updatedClassroomId = classroom_id !== undefined ? (classroom_id || null) : existing[0].classroom_id;

    await db.query(
      `UPDATE user_todos
       SET title = ?, completed = ?, priority = ?, due_date = ?, classroom_id = ?
       WHERE todo_id = ? AND user_id = ?`,
      [updatedTitle, updatedCompleted, updatedPriority, updatedDueDate, updatedClassroomId, id, userId]
    );

    res.json({ success: true, message: 'To-Do item updated' });
  } catch (error) {
    console.error('Error updating to-do:', error);
    res.status(500).json({ success: false, message: 'Server error updating to-do' });
  }
};

const deleteTodo = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  try {
    const [result] = await db.query(`DELETE FROM user_todos WHERE todo_id = ? AND user_id = ?`, [id, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'To-Do item not found' });
    }
    res.json({ success: true, message: 'To-Do item deleted' });
  } catch (error) {
    console.error('Error deleting to-do:', error);
    res.status(500).json({ success: false, message: 'Server error deleting to-do' });
  }
};

module.exports = {
  getLearnerDashboard,
  getInstructorDashboard,
  getCalendarEvents,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo
};
