const db = require('../config/db');

// Helper to check instructor or TA role
const isInstructorOrTA = async (userId, classroomId) => {
  const [rows] = await db.query(
    `SELECT role FROM classroom_members WHERE user_id = ? AND classroom_id = ? AND is_active = true`,
    [userId, classroomId]
  );
  if (rows.length === 0) return false;
  return rows[0].role === 'instructor' || rows[0].role === 'TA';
};

// GET /api/classrooms/:id/problems
const getClassroomProblems = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const { category, difficulty } = req.query;

    let query = `
      SELECT p.*, u.full_name AS creator_name,
             (SELECT COUNT(*) FROM problem_answers pa WHERE pa.problem_id = p.problem_id) AS has_solution
      FROM problems p
      JOIN users u ON p.created_by = u.user_id
      WHERE p.classroom_id = ? AND p.is_active = true
    `;
    const params = [classroomId];

    if (category) {
      query += ` AND p.category = ?`;
      params.push(category);
    }
    if (difficulty) {
      query += ` AND p.difficulty = ?`;
      params.push(difficulty);
    }

    query += ` ORDER BY p.category ASC, p.created_at DESC`;

    const [rows] = await db.query(query, params);

    // Grouping by category
    const categoriesMap = {};
    for (const p of rows) {
      if (!categoriesMap[p.category]) {
        categoriesMap[p.category] = [];
      }
      categoriesMap[p.category].push(p);
    }

    res.json({
      success: true,
      total: rows.length,
      grouped: categoriesMap,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/classrooms/:id/problems
const createProblem = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const { category, problem_title, problem_description, difficulty } = req.body;
    const userId = req.user.user_id;

    if (!(await isInstructorOrTA(userId, classroomId))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can add problems' });
    }

    if (!category || !problem_title || !problem_description) {
      return res.status(400).json({ success: false, message: 'Category, title, and description are required' });
    }

    const [result] = await db.query(
      `INSERT INTO problems (classroom_id, category, problem_title, problem_description, difficulty, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [classroomId, category, problem_title, problem_description, difficulty || 'medium', userId]
    );

    res.status(201).json({
      success: true,
      message: 'Problem added to problem bank successfully',
      data: { problem_id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating problem:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/problems/:id
const getProblemById = async (req, res) => {
  try {
    const problemId = req.params.id;
    const userId = req.user.user_id;

    const [problems] = await db.query(
      `SELECT p.*, u.full_name AS creator_name
       FROM problems p
       JOIN users u ON p.created_by = u.user_id
       WHERE p.problem_id = ? AND p.is_active = true`,
      [problemId]
    );

    if (problems.length === 0) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    const problem = problems[0];
    const isStaff = await isInstructorOrTA(userId, problem.classroom_id);

    // Fetch solution if exists
    const [sol] = await db.query(
      `SELECT pa.*, u.full_name AS instructor_name FROM problem_answers pa JOIN users u ON pa.instructor_id = u.user_id WHERE pa.problem_id = ?`,
      [problemId]
    );

    res.json({
      success: true,
      data: {
        ...problem,
        is_staff: isStaff,
        solution: isStaff && sol.length > 0 ? sol[0] : (sol.length > 0 ? { problem_answer_id: sol[0].problem_answer_id } : null)
      }
    });
  } catch (error) {
    console.error('Error fetching problem details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/problems/:id/answer - Upsert solution (instructor-only)
const upsertProblemAnswer = async (req, res) => {
  try {
    const problemId = req.params.id;
    const { solution_text, solution_file_url } = req.body;
    const userId = req.user.user_id;

    const [problems] = await db.query(`SELECT classroom_id FROM problems WHERE problem_id = ?`, [problemId]);
    if (problems.length === 0) return res.status(404).json({ success: false, message: 'Problem not found' });

    if (!(await isInstructorOrTA(userId, problems[0].classroom_id))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can post solutions' });
    }

    const [existing] = await db.query(`SELECT problem_answer_id FROM problem_answers WHERE problem_id = ?`, [problemId]);

    if (existing.length > 0) {
      await db.query(
        `UPDATE problem_answers SET instructor_id = ?, solution_text = ?, solution_file_url = ?, updated_at = NOW()
         WHERE problem_id = ?`,
        [userId, solution_text || null, solution_file_url || null, problemId]
      );
    } else {
      await db.query(
        `INSERT INTO problem_answers (problem_id, instructor_id, solution_text, solution_file_url)
         VALUES (?, ?, ?, ?)`,
        [problemId, userId, solution_text || null, solution_file_url || null]
      );
    }

    res.json({ success: true, message: 'Problem solution saved successfully' });
  } catch (error) {
    console.error('Error upserting problem solution:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getClassroomProblems,
  createProblem,
  getProblemById,
  upsertProblemAnswer
};
