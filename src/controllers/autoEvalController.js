/**
 * autoEvalController.js
 * Handles: test case management, auto-evaluation via Piston, teacher approval workflow
 */

const db = require('../config/db');
const { evaluateAllTestCases, getSupportedLanguages } = require('../utils/pistonApi');
const { createNotification } = require('../utils/notificationHelper');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const isInstructorOrTA = async (userId, classroomId) => {
  const [rows] = await db.query(
    `SELECT role FROM classroom_members WHERE user_id = ? AND classroom_id = ? AND is_active = true`,
    [userId, classroomId]
  );
  return rows.length > 0 && (rows[0].role === 'instructor' || rows[0].role === 'TA');
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/judge0/languages  (kept as /api/piston/languages for clarity)
// ─────────────────────────────────────────────────────────────────────────────
const getSupportedLanguagesList = (req, res) => {
  res.json({ success: true, data: getSupportedLanguages() });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/questions/:id/test-cases  (instructor/TA only)
// ─────────────────────────────────────────────────────────────────────────────
const addTestCase = async (req, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.user_id;
    const { input_data, expected_output, is_hidden, points, order_number } = req.body;

    if (!expected_output && expected_output !== '') {
      return res.status(400).json({ success: false, message: 'expected_output is required' });
    }

    // Resolve classroom from question
    const [rows] = await db.query(
      `SELECT q.question_id, h.classroom_id FROM questions q JOIN homework h ON q.homework_id = h.homework_id WHERE q.question_id = ?`,
      [questionId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Question not found' });
    if (!(await isInstructorOrTA(userId, rows[0].classroom_id))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [result] = await db.query(
      `INSERT INTO test_cases (question_id, input_data, expected_output, is_hidden, points, order_number) VALUES (?, ?, ?, ?, ?, ?)`,
      [questionId, input_data || '', expected_output, is_hidden ? 1 : 0, points || 1, order_number || 0]
    );

    res.status(201).json({ success: true, message: 'Test case added', data: { test_case_id: result.insertId } });
  } catch (error) {
    console.error('Error adding test case:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/questions/:id/test-cases
// Instructors see all; learners see only public ones
// ─────────────────────────────────────────────────────────────────────────────
const getTestCases = async (req, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.user_id;

    const [rows] = await db.query(
      `SELECT q.question_id, h.classroom_id FROM questions q JOIN homework h ON q.homework_id = h.homework_id WHERE q.question_id = ?`,
      [questionId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Question not found' });

    const isStaff = await isInstructorOrTA(userId, rows[0].classroom_id);

    let query = `SELECT * FROM test_cases WHERE question_id = ?`;
    if (!isStaff) query += ` AND is_hidden = false`;
    query += ` ORDER BY order_number ASC, test_case_id ASC`;

    const [testCases] = await db.query(query, [questionId]);

    // For learners, mask hidden test case details
    const safeTestCases = isStaff ? testCases : testCases.map(tc => ({
      test_case_id: tc.test_case_id,
      is_hidden: tc.is_hidden,
      points: tc.points,
      order_number: tc.order_number,
      input_data: tc.input_data,
      expected_output: tc.expected_output,
    }));

    res.json({ success: true, data: safeTestCases });
  } catch (error) {
    console.error('Error fetching test cases:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/test-cases/:id  (instructor/TA only)
// ─────────────────────────────────────────────────────────────────────────────
const updateTestCase = async (req, res) => {
  try {
    const testCaseId = req.params.id;
    const userId = req.user.user_id;
    const { input_data, expected_output, is_hidden, points, order_number } = req.body;

    const [rows] = await db.query(
      `SELECT tc.question_id, h.classroom_id FROM test_cases tc
       JOIN questions q ON tc.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
       WHERE tc.test_case_id = ?`,
      [testCaseId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Test case not found' });
    if (!(await isInstructorOrTA(userId, rows[0].classroom_id))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await db.query(
      `UPDATE test_cases SET input_data = ?, expected_output = ?, is_hidden = ?, points = ?, order_number = ? WHERE test_case_id = ?`,
      [input_data || '', expected_output, is_hidden ? 1 : 0, points || 1, order_number || 0, testCaseId]
    );

    res.json({ success: true, message: 'Test case updated' });
  } catch (error) {
    console.error('Error updating test case:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/test-cases/:id  (instructor/TA only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteTestCase = async (req, res) => {
  try {
    const testCaseId = req.params.id;
    const userId = req.user.user_id;

    const [rows] = await db.query(
      `SELECT tc.question_id, h.classroom_id FROM test_cases tc
       JOIN questions q ON tc.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
       WHERE tc.test_case_id = ?`,
      [testCaseId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Test case not found' });
    if (!(await isInstructorOrTA(userId, rows[0].classroom_id))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await db.query(`DELETE FROM test_cases WHERE test_case_id = ?`, [testCaseId]);
    res.json({ success: true, message: 'Test case deleted' });
  } catch (error) {
    console.error('Error deleting test case:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/submissions/:id/auto-evaluate
// Run Piston evaluation for a submission (can be called by learner or instructor)
// ─────────────────────────────────────────────────────────────────────────────
const runAutoEvaluation = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const userId = req.user.user_id;

    // Get submission details
    const [subs] = await db.query(
      `SELECT s.submission_id, s.learner_id, s.code_content, s.submission_type,
              q.question_id, q.is_coding_question, q.coding_language, q.coding_language_version,
              q.time_limit_seconds, q.points AS max_points,
              h.classroom_id, h.homework_id, h.title AS homework_title
       FROM submissions s
       JOIN questions q ON s.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
       WHERE s.submission_id = ?`,
      [submissionId]
    );

    if (subs.length === 0) return res.status(404).json({ success: false, message: 'Submission not found' });
    const sub = subs[0];

    // Must be learner who owns it, or instructor/TA
    const isStaff = await isInstructorOrTA(userId, sub.classroom_id);
    if (!isStaff && sub.learner_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!sub.is_coding_question) {
      return res.status(400).json({ success: false, message: 'This question does not have auto-evaluation enabled' });
    }

    if (!sub.code_content) {
      return res.status(400).json({ success: false, message: 'No code found in this submission' });
    }

    // Mark as pending
    await db.query(
      `UPDATE submissions SET auto_eval_status = 'pending' WHERE submission_id = ?`,
      [submissionId]
    );

    // Get ALL test cases (all hidden + public)
    const [testCases] = await db.query(
      `SELECT * FROM test_cases WHERE question_id = ? ORDER BY order_number ASC, test_case_id ASC`,
      [sub.question_id]
    );

    if (testCases.length === 0) {
      await db.query(
        `UPDATE submissions SET auto_eval_status = 'error' WHERE submission_id = ?`,
        [submissionId]
      );
      return res.status(400).json({ success: false, message: 'No test cases found for this question. Instructor must add test cases first.' });
    }

    const { language, version } = req.body || {};
    const lang = language || sub.coding_language || 'python';
    const ver = version || sub.coding_language_version;
    const timeLimitMs = Math.round((sub.time_limit_seconds || 2) * 1000);

    // Run evaluation
    const evalResult = await evaluateAllTestCases(
      sub.code_content,
      lang,
      ver,
      testCases,
      timeLimitMs
    );

    // Calculate score against question's max points
    const autoScore = sub.max_points > 0
      ? Math.round((evalResult.earnedPoints / evalResult.totalPoints) * sub.max_points * 100) / 100
      : 0;

    // Save results to submission
    await db.query(
      `UPDATE submissions 
       SET auto_eval_status = 'done', auto_eval_score = ?, auto_eval_results = ?, auto_eval_at = NOW()
       WHERE submission_id = ?`,
      [autoScore, JSON.stringify(evalResult), submissionId]
    );

    // Create/update grade entry as pending approval
    const [existingGrade] = await db.query(
      `SELECT grade_id FROM grades WHERE submission_id = ?`,
      [submissionId]
    );

    const [instructor] = await db.query(
      `SELECT user_id FROM classroom_members WHERE classroom_id = ? AND role = 'instructor' AND is_active = true LIMIT 1`,
      [sub.classroom_id]
    );
    const instructorId = instructor.length > 0 ? instructor[0].user_id : userId;

    if (existingGrade.length > 0) {
      await db.query(
        `UPDATE grades SET auto_score = ?, approval_status = 'auto_pending', is_draft = true WHERE submission_id = ?`,
        [autoScore, submissionId]
      );
    } else {
      await db.query(
        `INSERT INTO grades (submission_id, instructor_id, score, feedback, is_draft, auto_score, approval_status)
         VALUES (?, ?, ?, ?, true, ?, 'auto_pending')`,
        [submissionId, instructorId, autoScore, `Auto-evaluated: ${evalResult.passed}/${evalResult.total} test cases passed`, autoScore]
      );
    }

    // Notify instructor about new auto-eval submission
    const [instructors] = await db.query(
      `SELECT user_id FROM classroom_members WHERE classroom_id = ? AND role IN ('instructor','TA') AND is_active = true`,
      [sub.classroom_id]
    );
    const [learnerRow] = await db.query(`SELECT full_name FROM users WHERE user_id = ?`, [sub.learner_id]);
    const learnerName = learnerRow.length > 0 ? learnerRow[0].full_name : 'A student';

    for (const inst of instructors) {
      if (inst.user_id !== sub.learner_id) {
        await createNotification(
          inst.user_id,
          'auto_eval',
          '🤖 Auto-Eval Complete — Approval Needed',
          `${learnerName}'s code scored ${evalResult.passed}/${evalResult.total} tests (${autoScore} pts) for "${sub.homework_title}". Tap to review & approve.`,
          `/homework.html?id=${sub.homework_id}`
        );
      }
    }

    res.json({
      success: true,
      message: 'Auto-evaluation complete',
      data: {
        submission_id: submissionId,
        auto_score: autoScore,
        passed: evalResult.passed,
        total: evalResult.total,
        percent_score: evalResult.percentScore,
        results: evalResult.results,
        approval_status: 'auto_pending'
      }
    });
  } catch (error) {
    console.error('Error running auto-evaluation:', error);
    // Mark as error in DB
    try {
      await db.query(
        `UPDATE submissions SET auto_eval_status = 'error' WHERE submission_id = ?`,
        [req.params.id]
      );
    } catch (dbErr) { /* ignore */ }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/submissions/:id/approve-grade  (instructor/TA only)
// Teacher approves the auto-generated grade as-is
// ─────────────────────────────────────────────────────────────────────────────
const approveAutoGrade = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { feedback } = req.body;
    const instructorId = req.user.user_id;

    const [subs] = await db.query(
      `SELECT s.learner_id, s.auto_eval_score, s.auto_eval_status,
              q.homework_id, q.points AS max_points,
              h.classroom_id, h.title AS homework_title
       FROM submissions s
       JOIN questions q ON s.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
       WHERE s.submission_id = ?`,
      [submissionId]
    );

    if (subs.length === 0) return res.status(404).json({ success: false, message: 'Submission not found' });
    const sub = subs[0];

    if (!(await isInstructorOrTA(instructorId, sub.classroom_id))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can approve grades' });
    }

    if (sub.auto_eval_status !== 'done') {
      return res.status(400).json({ success: false, message: 'Auto-evaluation has not been run yet' });
    }

    const finalScore = sub.auto_eval_score;

    await db.query(
      `UPDATE grades 
       SET score = ?, feedback = ?, is_draft = false, approval_status = 'approved',
           approved_at = NOW(), approved_by = ?, instructor_id = ?, updated_at = NOW()
       WHERE submission_id = ?`,
      [finalScore, feedback || `Approved. Auto score: ${finalScore}`, instructorId, instructorId, submissionId]
    );

    // Notify learner
    await createNotification(
      sub.learner_id,
      'grade',
      '✅ Grade Approved',
      `Your submission for "${sub.homework_title}" has been approved. Score: ${finalScore}/${sub.max_points} pts.`,
      `/homework.html?id=${sub.homework_id}`
    );

    res.json({ success: true, message: 'Grade approved and learner notified', data: { score: finalScore } });
  } catch (error) {
    console.error('Error approving grade:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/submissions/:id/override-grade  (instructor/TA only)
// Teacher overrides the auto score with a custom score
// ─────────────────────────────────────────────────────────────────────────────
const overrideAutoGrade = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { score, feedback } = req.body;
    const instructorId = req.user.user_id;

    if (score === undefined || score === null) {
      return res.status(400).json({ success: false, message: 'score is required' });
    }

    const [subs] = await db.query(
      `SELECT s.learner_id, q.homework_id, q.points AS max_points, h.classroom_id, h.title AS homework_title
       FROM submissions s
       JOIN questions q ON s.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
       WHERE s.submission_id = ?`,
      [submissionId]
    );

    if (subs.length === 0) return res.status(404).json({ success: false, message: 'Submission not found' });
    const sub = subs[0];

    if (!(await isInstructorOrTA(instructorId, sub.classroom_id))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await db.query(
      `UPDATE grades 
       SET score = ?, feedback = ?, is_draft = false, approval_status = 'manual',
           approved_at = NOW(), approved_by = ?, instructor_id = ?, updated_at = NOW()
       WHERE submission_id = ?`,
      [score, feedback || `Score manually overridden by instructor.`, instructorId, instructorId, submissionId]
    );

    await createNotification(
      sub.learner_id,
      'grade',
      '📝 Grade Updated',
      `Your submission for "${sub.homework_title}" has been graded: ${score}/${sub.max_points} pts.`,
      `/homework.html?id=${sub.homework_id}`
    );

    res.json({ success: true, message: 'Grade overridden and learner notified', data: { score } });
  } catch (error) {
    console.error('Error overriding grade:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/questions/:id/run-code  (learner — public tests only, no save)
// "Run" button — test before submitting
// ─────────────────────────────────────────────────────────────────────────────
const runCodeOnly = async (req, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.user_id;
    const { code, language, version } = req.body;

    if (!code) return res.status(400).json({ success: false, message: 'code is required' });

    // Get question info
    const [rows] = await db.query(
      `SELECT q.question_id, q.is_coding_question, q.coding_language, q.coding_language_version,
              q.time_limit_seconds, h.classroom_id
       FROM questions q JOIN homework h ON q.homework_id = h.homework_id
       WHERE q.question_id = ?`,
      [questionId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Question not found' });
    const q = rows[0];

    if (!q.is_coding_question) {
      return res.status(400).json({ success: false, message: 'Not a coding question' });
    }

    // Only public test cases for "Run"
    const [testCases] = await db.query(
      `SELECT * FROM test_cases WHERE question_id = ? AND is_hidden = false ORDER BY order_number ASC`,
      [questionId]
    );

    if (testCases.length === 0) {
      return res.status(400).json({ success: false, message: 'No public test cases available to run against.' });
    }

    const lang = language || q.coding_language;
    const ver = version || q.coding_language_version;
    const timeLimitMs = Math.round((q.time_limit_seconds || 2) * 1000);

    const evalResult = await evaluateAllTestCases(code, lang, ver, testCases, timeLimitMs);

    res.json({
      success: true,
      message: `${evalResult.passed}/${evalResult.total} public test cases passed`,
      data: {
        passed: evalResult.passed,
        total: evalResult.total,
        results: evalResult.results
      }
    });
  } catch (error) {
    console.error('Error running code:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSupportedLanguagesList,
  addTestCase,
  getTestCases,
  updateTestCase,
  deleteTestCase,
  runAutoEvaluation,
  approveAutoGrade,
  overrideAutoGrade,
  runCodeOnly
};
