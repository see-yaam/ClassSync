const db = require('../config/db');
const { createNotification } = require('../utils/notificationHelper');

// Helper to check instructor or TA role
const isInstructorOrTA = async (userId, classroomId) => {
  const [rows] = await db.query(
    `SELECT role FROM classroom_members WHERE user_id = ? AND classroom_id = ? AND is_active = true`,
    [userId, classroomId]
  );
  if (rows.length === 0) return false;
  return rows[0].role === 'instructor' || rows[0].role === 'TA';
};

// POST /api/classrooms/:id/homework - Create homework set
const createHomework = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const { title, description, total_points, deadline, is_published } = req.body;
    const userId = req.user.user_id;

    if (!(await isInstructorOrTA(userId, classroomId))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can create homework' });
    }

    if (!title) {
      return res.status(400).json({ success: false, message: 'Homework title is required' });
    }

    const publishedAt = is_published ? new Date() : null;

    const [result] = await db.query(
      `INSERT INTO homework (classroom_id, title, description, total_points, created_by, deadline, is_published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [classroomId, title, description || '', total_points || 100, userId, deadline || null, is_published ? true : false, publishedAt]
    );

    const homework_id = result.insertId;

    // If published, notify all learners in classroom
    if (is_published) {
      const [members] = await db.query(
        `SELECT user_id FROM classroom_members WHERE classroom_id = ? AND role = 'learner' AND is_active = true`,
        [classroomId]
      );
      for (const m of members) {
        await createNotification(
          m.user_id,
          'homework',
          'New Homework Published',
          `New homework "${title}" has been published.`,
          `/homework.html?id=${homework_id}`
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Homework created successfully',
      data: { homework_id, title }
    });
  } catch (error) {
    console.error('Error creating homework:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/homework/:id/publish - Toggle publish status
const togglePublishHomework = async (req, res) => {
  try {
    const homeworkId = req.params.id;
    const { is_published } = req.body;
    const userId = req.user.user_id;

    const [hw] = await db.query(`SELECT classroom_id, title FROM homework WHERE homework_id = ?`, [homeworkId]);
    if (hw.length === 0) return res.status(404).json({ success: false, message: 'Homework not found' });

    if (!(await isInstructorOrTA(userId, hw[0].classroom_id))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const publishedAt = is_published ? new Date() : null;
    await db.query(
      `UPDATE homework SET is_published = ?, published_at = ? WHERE homework_id = ?`,
      [is_published ? true : false, publishedAt, homeworkId]
    );

    res.json({ success: true, message: `Homework ${is_published ? 'published' : 'unpublished'}` });
  } catch (error) {
    console.error('Error publishing homework:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/homework - List classroom homework
const getClassroomHomework = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const userId = req.user.user_id;

    const isStaff = await isInstructorOrTA(userId, classroomId);

    let query = `
      SELECT h.homework_id, h.classroom_id, h.title, h.description, h.total_points, h.deadline,
             h.is_published, h.published_at, h.created_at, u.full_name AS creator_name,
             (SELECT COUNT(*) FROM questions q WHERE q.homework_id = h.homework_id) AS question_count
      FROM homework h
      JOIN users u ON h.created_by = u.user_id
      WHERE h.classroom_id = ?
    `;

    if (!isStaff) {
      query += ` AND h.is_published = true`;
    }
    query += ` ORDER BY h.created_at DESC`;

    const [rows] = await db.query(query, [classroomId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching homework:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/homework/:id - Get homework details & questions
const getHomeworkById = async (req, res) => {
  try {
    const homeworkId = req.params.id;
    const userId = req.user.user_id;

    const [hw] = await db.query(
      `SELECT h.*, c.classroom_name, u.full_name AS creator_name
       FROM homework h
       JOIN classrooms c ON h.classroom_id = c.classroom_id
       JOIN users u ON h.created_by = u.user_id
       WHERE h.homework_id = ?`,
      [homeworkId]
    );

    if (hw.length === 0) {
      return res.status(404).json({ success: false, message: 'Homework not found' });
    }

    const homework = hw[0];
    const isStaff = await isInstructorOrTA(userId, homework.classroom_id);

    if (!isStaff && !homework.is_published) {
      return res.status(403).json({ success: false, message: 'This homework is not yet published' });
    }

    // Fetch questions
    const [questions] = await db.query(
      `SELECT q.*, 
              s.submission_id, s.submitted_at, s.is_late, s.penalty_applied, s.code_content, s.file_url,
              g.grade_id, g.score, g.feedback, g.is_draft, g.graded_at
       FROM questions q
       LEFT JOIN submissions s ON q.question_id = s.question_id AND s.learner_id = ?
       LEFT JOIN grades g ON s.submission_id = g.submission_id
       WHERE q.homework_id = ?
       ORDER BY q.order_number ASC, q.question_id ASC`,
      [userId, homeworkId]
    );

    res.json({
      success: true,
      data: {
        ...homework,
        is_staff: isStaff,
        questions
      }
    });
  } catch (error) {
    console.error('Error fetching homework detail:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/homework/:id/questions - Add question
const addQuestion = async (req, res) => {
  try {
    const homeworkId = req.params.id;
    const { question_type, question_text, question_data, points, order_number, answer_text, answer_file_url } = req.body;
    const userId = req.user.user_id;

    const [hw] = await db.query(`SELECT classroom_id FROM homework WHERE homework_id = ?`, [homeworkId]);
    if (hw.length === 0) return res.status(404).json({ success: false, message: 'Homework not found' });

    if (!(await isInstructorOrTA(userId, hw[0].classroom_id))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!question_text) {
      return res.status(400).json({ success: false, message: 'Question text is required' });
    }

    const [result] = await db.query(
      `INSERT INTO questions (homework_id, question_type, question_text, question_data, points, order_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [homeworkId, question_type || 'text', question_text, question_data || null, points || 10, order_number || 0]
    );

    const question_id = result.insertId;

    // Optional answer key upload
    if (answer_text || answer_file_url) {
      await db.query(
        `INSERT INTO homework_answers (question_id, instructor_id, answer_text, answer_file_url)
         VALUES (?, ?, ?, ?)`,
        [question_id, userId, answer_text || null, answer_file_url || null]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: { question_id }
    });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/questions/:id/answer - Get answer key (learner can ONLY see if they submitted)
const getQuestionAnswer = async (req, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.user_id;

    // Check question & classroom
    const [q] = await db.query(
      `SELECT q.question_id, h.classroom_id FROM questions q JOIN homework h ON q.homework_id = h.homework_id WHERE q.question_id = ?`,
      [questionId]
    );

    if (q.length === 0) return res.status(404).json({ success: false, message: 'Question not found' });

    const classroomId = q[0].classroom_id;
    const isStaff = await isInstructorOrTA(userId, classroomId);

    if (!isStaff) {
      // Check if learner has submitted for this question
      const [sub] = await db.query(
        `SELECT submission_id FROM submissions WHERE question_id = ? AND learner_id = ?`,
        [questionId, userId]
      );

      if (sub.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Answer key is locked! You must submit your solution first to view the answer key.'
        });
      }
    }

    const [ans] = await db.query(
      `SELECT ha.*, u.full_name AS instructor_name
       FROM homework_answers ha
       JOIN users u ON ha.instructor_id = u.user_id
       WHERE ha.question_id = ?`,
      [questionId]
    );

    if (ans.length === 0) {
      return res.status(404).json({ success: false, message: 'No answer key provided for this question yet.' });
    }

    res.json({ success: true, data: ans[0] });
  } catch (error) {
    console.error('Error fetching question answer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createHomework,
  togglePublishHomework,
  getClassroomHomework,
  getHomeworkById,
  addQuestion,
  getQuestionAnswer
};
