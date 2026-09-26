const db = require('../config/db');
const crypto = require('crypto');
const { calculateSimilarity } = require('./plagiarismController');

// Compute SHA256/MD5 Hash for code plagiarism comparison
const computeCodeHash = (text) => {
  const normalized = (text || '').trim().replace(/\s+/g, ' ');
  return crypto.createHash('md5').update(normalized).digest('hex');
};

// POST /api/questions/:id/submit - Create / Overwrite Submission
const refreshHomeworkPlagiarismChecks = async ({ classroomId, homeworkId, actorUserId }) => {
  if (!classroomId || !homeworkId) return;

  const [submissions] = await db.query(
    `SELECT s.submission_id, s.question_id, s.learner_id, s.code_content
     FROM submissions s
     JOIN questions q ON s.question_id = q.question_id
     JOIN homework h ON q.homework_id = h.homework_id
    WHERE h.classroom_id = ? AND h.homework_id = ?
      AND h.is_active = true
      AND s.submission_type = 'text'
      AND s.code_content IS NOT NULL
      AND TRIM(s.code_content) != ''
    ORDER BY s.submission_id ASC`,
    [classroomId, homeworkId]
  );

  await db.query(
    `DELETE pf
     FROM plagiarism_flags pf
     JOIN submissions s1 ON pf.submission_id_1 = s1.submission_id
     JOIN questions q1 ON s1.question_id = q1.question_id
     JOIN homework h1 ON q1.homework_id = h1.homework_id
    WHERE h1.classroom_id = ? AND h1.homework_id = ?`,
    [classroomId, homeworkId]
  );

  for (let i = 0; i < submissions.length; i++) {
    for (let j = i + 1; j < submissions.length; j++) {
      const sub1 = submissions[i];
      const sub2 = submissions[j];

      if (sub1.question_id === sub2.question_id && sub1.learner_id !== sub2.learner_id) {
        const similarityScore = calculateSimilarity(sub1.code_content, sub2.code_content);
        const id1 = Math.min(sub1.submission_id, sub2.submission_id);
        const id2 = Math.max(sub1.submission_id, sub2.submission_id);

        await db.query(
          `INSERT INTO plagiarism_flags (submission_id_1, submission_id_2, similarity_score, flagged_by)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             similarity_score = VALUES(similarity_score),
             flagged_by = VALUES(flagged_by),
             updated_at = NOW()`,
          [id1, id2, similarityScore, actorUserId || 0]
        );
      }
    }
  }

  return submissions.length;
};

const submitQuestionSolution = async (req, res) => {
  try {
    const questionId = req.params.id;
    const { code_content, file_url, submission_type, submission_metadata } = req.body;
    const learnerId = req.user.user_id;

    if (!code_content && !file_url) {
      return res.status(400).json({ success: false, message: 'Must provide code_content or file_url' });
    }

    const validTypes = ['text', 'link', 'pdf', 'docx', 'pptx'];
    const subType = validTypes.includes(submission_type) ? submission_type : (file_url ? 'pdf' : 'text');

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
         SET submission_type = ?, code_hash = ?, code_content = ?, file_url = ?, submitted_at = NOW(),
             is_late = ?, minutes_late = ?, penalty_applied = ?, is_final = true,
             submission_metadata = ?
         WHERE submission_id = ?`,
        [
          subType,
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
        `INSERT INTO submissions (question_id, learner_id, submission_type, code_hash, code_content, file_url, is_late, minutes_late, penalty_applied, is_final, submission_metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?)`,
        [
          questionId,
          learnerId,
          subType,
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

    await refreshHomeworkPlagiarismChecks({
      classroomId: homework.classroom_id,
      homeworkId: homework.homework_id,
      actorUserId: learnerId
    });

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

    // Get published homeworks ordered by creation date for streak check
    const [allHomeworks] = await db.query(
      `SELECT homework_id FROM homework WHERE classroom_id = ? AND is_published = true ORDER BY created_at ASC`,
      [classroomId]
    );

    // Build pivot matrix data
    const matrix = await Promise.all(learners.map(async learner => {
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

      // Calculate streak: consecutive homework sets with full marks
      let streak = 0;
      const reversedHw = [...allHomeworks].reverse();
      for (const hwItem of reversedHw) {
        const [qSum] = await db.query(`SELECT SUM(points) AS max_pts FROM questions WHERE homework_id = ?`, [hwItem.homework_id]);
        const maxPoints = parseFloat(qSum[0]?.max_pts || 0);
        if (maxPoints === 0) continue;

        const [eSum] = await db.query(
          `SELECT SUM(g.score) AS earned_pts
           FROM submissions s
           JOIN questions q ON s.question_id = q.question_id
           JOIN grades g ON s.submission_id = g.submission_id
           WHERE q.homework_id = ? AND s.learner_id = ? AND g.is_draft = false`,
          [hwItem.homework_id, learner.user_id]
        );

        const earnedPoints = parseFloat(eSum[0]?.earned_pts || 0);
        if (earnedPoints >= maxPoints && maxPoints > 0) {
          streak++;
        } else {
          break;
        }
      }

      return {
        learner_id: learner.user_id,
        full_name: learner.full_name,
        email: learner.email,
        total_earned: totalEarned,
        total_possible: totalPossible,
        late_count: lateCount,
        streak,
        questions: questionStatuses
      };
    }));

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
      `SELECT s.submission_id, s.question_id, s.learner_id, s.submission_type, u.full_name AS learner_name, u.email AS learner_email,
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

// GET /api/submissions/:id - Fetch a single submission for preview/grading
const getSubmissionById = async (req, res) => {
  try {
    const submissionId = req.params.id;

    const [rows] = await db.query(
      `SELECT s.submission_id, s.question_id, s.learner_id, s.submission_type,
              u.full_name AS learner_name, u.email AS learner_email,
              s.code_content, s.file_url, s.submitted_at, s.is_late, s.penalty_applied,
              s.minutes_late, s.is_final,
              g.score, g.feedback, g.grade_id
       FROM submissions s
       JOIN users u ON s.learner_id = u.user_id
       LEFT JOIN grades g ON s.submission_id = g.submission_id
       WHERE s.submission_id = ?`,
      [submissionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching submission by ID:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  submitQuestionSolution,
  refreshHomeworkPlagiarismChecks,
  getSubmissionMatrix,
  getQuestionSubmissions,
  getSubmissionById
};
