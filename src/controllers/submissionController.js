const db = require('../config/db');
const crypto = require('crypto');

// Compute SHA256/MD5 Hash for code plagiarism comparison
const computeCodeHash = (text) => {
  const normalized = (text || '').trim().replace(/\s+/g, ' ');
  return crypto.createHash('md5').update(normalized).digest('hex');
};

// POST /api/questions/:id/submit - Create / Overwrite Submission
const submitQuestionSolution = async (req, res) => {
  try {
    const questionId = req.params.id;
    const { code_content, file_url, submission_metadata } = req.body;
    const learnerId = req.user.user_id;

    if (!code_content && !file_url) {
      return res.status(400).json({ success: false, message: 'Must provide code_content or file_url' });
    }

    // Get question & homework deadline
    const [q] = await db.query(
      `SELECT q.question_id, q.homework_id, h.deadline, h.classroom_id
       FROM questions q
       JOIN homework h ON q.homework_id = h.homework_id
       WHERE q.question_id = ?`,
      [questionId]
    );

    if (q.length === 0) return res.status(404).json({ success: false, message: 'Question not found' });

    const homework = q[0];

    // Compute deadline check
    const now = new Date();
    let isLate = false;
    let minutesLate = 0;
    let penaltyApplied = 0;

    if (homework.deadline) {
      const deadlineDate = new Date(homework.deadline);
      if (now > deadlineDate) {
        isLate = true;
        minutesLate = Math.ceil((now - deadlineDate) / (1000 * 60));
        // Simple automatic penalty rule: 10% penalty for late submission
        penaltyApplied = 10;
      }
    }

    const codeHash = computeCodeHash(code_content || file_url);

    // Upsert into submissions table using ON DUPLICATE KEY UPDATE
    const [existing] = await db.query(
      `SELECT submission_id FROM submissions WHERE question_id = ? AND learner_id = ?`,
      [questionId, learnerId]
    );

    let submissionId;

    if (existing.length > 0) {
      submissionId = existing[0].submission_id;
      await db.query(
        `UPDATE submissions
         SET code_hash = ?, code_content = ?, file_url = ?, submitted_at = NOW(),
             is_late = ?, minutes_late = ?, penalty_applied = ?, is_final = true,
             submission_metadata = ?
         WHERE submission_id = ?`,
        [
          codeHash,
          code_content || null,
          file_url || null,
          isLate,
          minutesLate,
          penaltyApplied,
          submission_metadata ? JSON.stringify(submission_metadata) : null,
          submissionId
        ]
      );
    } else {
      const [result] = await db.query(
        `INSERT INTO submissions (question_id, learner_id, code_hash, code_content, file_url, is_late, minutes_late, penalty_applied, is_final, submission_metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, ?)`,
        [
          questionId,
          learnerId,
          codeHash,
          code_content || null,
          file_url || null,
          isLate,
          minutesLate,
          penaltyApplied,
          submission_metadata ? JSON.stringify(submission_metadata) : null
        ]
      );
      submissionId = result.insertId;
    }

    res.json({
      success: true,
      message: existing.length > 0 ? 'Submission overwritten successfully' : 'Submission created successfully',
      data: {
        submission_id: submissionId,
        is_late: isLate,
        minutes_late: minutesLate,
        penalty_applied: penaltyApplied,
        submitted_at: now
      }
    });
  } catch (error) {
    console.error('Error submitting question:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/homework/:id/matrix - Submission Matrix (Pivot table: Learners x Questions)
const getSubmissionMatrix = async (req, res) => {
  try {
    const homeworkId = req.params.id;

    // Get homework details & classroom
    const [hw] = await db.query(`SELECT classroom_id, title FROM homework WHERE homework_id = ?`, [homeworkId]);
    if (hw.length === 0) return res.status(404).json({ success: false, message: 'Homework not found' });

    const classroomId = hw[0].classroom_id;

    // Get all learners in this classroom
    const [learners] = await db.query(
      `SELECT u.user_id, u.full_name, u.email
       FROM classroom_members cm
       JOIN users u ON cm.user_id = u.user_id
       WHERE cm.classroom_id = ? AND cm.role IN ('learner', 'TA') AND cm.is_active = true
       ORDER BY u.full_name ASC`,
      [classroomId]
    );

    // Get all questions in this homework
    const [questions] = await db.query(
      `SELECT question_id, question_text, points, order_number
       FROM questions
       WHERE homework_id = ?
       ORDER BY order_number ASC, question_id ASC`,
      [homeworkId]
    );

    // Get all submissions & grades for this homework
    const [submissions] = await db.query(
      `SELECT s.submission_id, s.question_id, s.learner_id, s.submitted_at, s.is_late, s.penalty_applied,
              g.grade_id, g.score, g.feedback, g.is_draft
       FROM submissions s
       JOIN questions q ON s.question_id = q.question_id
       LEFT JOIN grades g ON s.submission_id = g.submission_id
       WHERE q.homework_id = ?`,
      [homeworkId]
    );

    // Map submissions lookup key: `${learner_id}_${question_id}`
    const subMap = {};
    for (const sub of submissions) {
      subMap[`${sub.learner_id}_${sub.question_id}`] = sub;
    }

    // Build pivot matrix data
    const matrix = learners.map(learner => {
      const questionStatuses = {};
      let totalEarned = 0;
      let totalPossible = 0;
      let lateCount = 0;

      for (const q of questions) {
        totalPossible += q.points || 0;
        const sub = subMap[`${learner.user_id}_${q.question_id}`];

        if (!sub) {
          questionStatuses[q.question_id] = {
            status: 'gray', // Missing
            label: 'Missing',
            submission_id: null,
            score: null
          };
        } else if (sub.is_late) {
          lateCount++;
          questionStatuses[q.question_id] = {
            status: 'orange', // Late
            label: `Late (-${sub.penalty_applied}%)`,
            submission_id: sub.submission_id,
            score: sub.score !== null ? parseFloat(sub.score) : null,
            graded: sub.score !== null
          };
          if (sub.score !== null) totalEarned += parseFloat(sub.score);
        } else {
          questionStatuses[q.question_id] = {
            status: 'green', // On Time
            label: 'Submitted',
            submission_id: sub.submission_id,
            score: sub.score !== null ? parseFloat(sub.score) : null,
            graded: sub.score !== null
          };
          if (sub.score !== null) totalEarned += parseFloat(sub.score);
        }
      }

      return {
        learner_id: learner.user_id,
        full_name: learner.full_name,
        email: learner.email,
        total_earned: totalEarned,
        total_possible: totalPossible,
        late_count: lateCount,
        questions: questionStatuses
      };
    });

    res.json({
      success: true,
      data: {
        homework_id: homeworkId,
        title: hw[0].title,
        questions,
        matrix
      }
    });
  } catch (error) {
    console.error('Error computing submission matrix:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/questions/:id/submissions - List all submissions for a question
const getQuestionSubmissions = async (req, res) => {
  try {
    const questionId = req.params.id;

    const [rows] = await db.query(
      `SELECT s.submission_id, s.question_id, s.learner_id, u.full_name AS learner_name, u.email AS learner_email,
              s.code_hash, s.code_content, s.file_url, s.submitted_at, s.is_late, s.minutes_late, s.penalty_applied,
              g.grade_id, g.score, g.feedback, g.is_draft, g.graded_at,
              (SELECT COUNT(*) FROM code_reviews cr WHERE cr.submission_id = s.submission_id) AS review_count
       FROM submissions s
       JOIN users u ON s.learner_id = u.user_id
       LEFT JOIN grades g ON s.submission_id = g.submission_id
       WHERE s.question_id = ?
       ORDER BY s.submitted_at DESC`,
      [questionId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching question submissions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  submitQuestionSolution,
  getSubmissionMatrix,
  getQuestionSubmissions
};
