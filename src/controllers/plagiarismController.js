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

// POST /api/classrooms/:id/plagiarism-check - Trigger scan
const runPlagiarismScan = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const userId = req.user.user_id;

    if (!(await isInstructorOrTA(userId, classroomId))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can run plagiarism checks' });
    }

    // Fetch all submissions for questions belonging to homeworks in this classroom
    const [submissions] = await db.query(
      `SELECT s.submission_id, s.question_id, s.learner_id, s.code_hash, s.code_content, q.homework_id
       FROM submissions s
       JOIN questions q ON s.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
       WHERE h.classroom_id = ? AND s.code_hash IS NOT NULL AND s.code_hash != ''`,
      [classroomId]
    );

    let newFlagsCount = 0;

    // Compare pairwise for identical question_id and identical code_hash (different learners)
    for (let i = 0; i < submissions.length; i++) {
      for (let j = i + 1; j < submissions.length; j++) {
        const sub1 = submissions[i];
        const sub2 = submissions[j];

        if (sub1.question_id === sub2.question_id && sub1.learner_id !== sub2.learner_id) {
          // Exact code_hash match or high similarity
          if (sub1.code_hash === sub2.code_hash) {
            // Ensure submission_id_1 < submission_id_2 as required by DB CHECK constraint!
            const id1 = Math.min(sub1.submission_id, sub2.submission_id);
            const id2 = Math.max(sub1.submission_id, sub2.submission_id);

            // Check if already flagged
            const [existing] = await db.query(
              `SELECT flag_id FROM plagiarism_flags WHERE submission_id_1 = ? AND submission_id_2 = ?`,
              [id1, id2]
            );

            if (existing.length === 0) {
              await db.query(
                `INSERT INTO plagiarism_flags (submission_id_1, submission_id_2, similarity_score, flagged_by)
                 VALUES (?, ?, 100.00, ?)`,
                [id1, id2, userId]
              );
              newFlagsCount++;
            }
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Plagiarism check completed. Found ${newFlagsCount} new potential duplicate submission pairs.`,
      new_flags_count: newFlagsCount
    });
  } catch (error) {
    console.error('Error running plagiarism check:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/plagiarism-flags - List flags
const getPlagiarismFlags = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const userId = req.user.user_id;

    if (!(await isInstructorOrTA(userId, classroomId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [flags] = await db.query(
      `SELECT pf.*,
              s1.code_content AS content_1, u1.full_name AS learner_1_name, u1.email AS learner_1_email,
              s2.code_content AS content_2, u2.full_name AS learner_2_name, u2.email AS learner_2_email,
              q.question_text, h.title AS homework_title
       FROM plagiarism_flags pf
       JOIN submissions s1 ON pf.submission_id_1 = s1.submission_id
       JOIN submissions s2 ON pf.submission_id_2 = s2.submission_id
       JOIN users u1 ON s1.learner_id = u1.user_id
       JOIN users u2 ON s2.learner_id = u2.user_id
       JOIN questions q ON s1.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
       WHERE h.classroom_id = ?
       ORDER BY pf.created_at DESC`,
      [classroomId]
    );

    res.json({ success: true, data: flags });
  } catch (error) {
    console.error('Error fetching plagiarism flags:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/plagiarism-flags/:id/review - Review flag
const reviewPlagiarismFlag = async (req, res) => {
  try {
    const flagId = req.params.id;
    const { is_reviewed, review_notes } = req.body;
    const userId = req.user.user_id;

    await db.query(
      `UPDATE plagiarism_flags
       SET is_reviewed = ?, review_notes = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE flag_id = ?`,
      [is_reviewed ? true : false, review_notes || '', userId, flagId]
    );

    res.json({ success: true, message: 'Plagiarism review updated' });
  } catch (error) {
    console.error('Error reviewing plagiarism flag:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  runPlagiarismScan,
  getPlagiarismFlags,
  reviewPlagiarismFlag
};
