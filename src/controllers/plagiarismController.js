const db = require('../config/db');

const normalizeForComparison = (text) => {
  if (text == null) return '';

  return String(text)
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const canonicalizeCode = (code) => {
  const normalized = normalizeForComparison(code);
  const withoutComments = normalized
    .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, 'STRING')
    .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
    .replace(/\b\d+(?:\.\d+)?\b/g, 'NUMBER');

  const tokens = withoutComments.match(/[\p{L}_$][\p{L}\p{N}_$]*|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|=>|[{}()[\].,;:+\-*\/%<>=!?]/gu) || [];
  const identifiers = new Map();
  let nextIdentifier = 0;

  return tokens.map((token) => {
    if (!/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(token)) return token;
    if (/^(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|try|catch|finally|throw|async|await|true|false|null|undefined|this|typeof|instanceof|in|of)$/.test(token)) {
      return token;
    }
    if (!identifiers.has(token)) identifiers.set(token, `IDENTIFIER_${nextIdentifier++}`);
    return identifiers.get(token);
  });
};

const calculateSimilarity = (code1, code2) => {
  const left = normalizeForComparison(code1);
  const right = normalizeForComparison(code2);

  if (!left && !right) return 0;
  if (left === right) return 100;

  const tokens1 = canonicalizeCode(code1);
  const tokens2 = canonicalizeCode(code2);
  const shingles = (tokens) => new Set(
    tokens.slice(0, -2).map((_, index) => tokens.slice(index, index + 3).join(' '))
  );
  const shingles1 = shingles(tokens1);
  const shingles2 = shingles(tokens2);
  const intersection = [...shingles1].filter((shingle) => shingles2.has(shingle)).length;
  const union = new Set([...shingles1, ...shingles2]).size;

  return union === 0 ? 0 : (intersection / union) * 100;
};

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
    const homeworkId = Number(req.body.homework_id);

    if (!(await isInstructorOrTA(userId, classroomId))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can run plagiarism checks' });
    }
    if (!homeworkId) {
      return res.status(400).json({ success: false, message: 'Please select a homework set before running the plagiarism scan' });
    }

    // Fetch text submissions with content; similarity detection does not require code_hash.
    const [submissions] = await db.query(
      `SELECT s.submission_id, s.question_id, s.learner_id, s.code_hash, s.code_content, q.homework_id
       FROM submissions s
       JOIN questions q ON s.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
      WHERE h.classroom_id = ? AND h.homework_id = ?
         AND h.is_active = true
         AND s.submission_type = 'text'
         AND s.code_content IS NOT NULL 
         AND TRIM(s.code_content) != ''`,
      [classroomId, homeworkId]
    );

    await db.query(
      `DELETE pf
       FROM plagiarism_flags pf
       JOIN submissions s1 ON pf.submission_id_1 = s1.submission_id
       JOIN questions q ON s1.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
      WHERE h.classroom_id = ? AND h.homework_id = ?`,
          [classroomId, homeworkId]
    );

    let newFlagsCount = 0;

    // Compare submissions for the same question and different learners.
    for (let i = 0; i < submissions.length; i++) {
      for (let j = i + 1; j < submissions.length; j++) {
        const sub1 = submissions[i];
        const sub2 = submissions[j];

        if (sub1.question_id === sub2.question_id && sub1.learner_id !== sub2.learner_id) {
          const similarityScore = calculateSimilarity(sub1.code_content, sub2.code_content);

          // Always store the actual match percentage for each pair so the instructor can see
          // both low-risk and high-risk matches in the plagiarism table.
          const id1 = Math.min(sub1.submission_id, sub2.submission_id);
          const id2 = Math.max(sub1.submission_id, sub2.submission_id);

          await db.query(
            `INSERT INTO plagiarism_flags (submission_id_1, submission_id_2, similarity_score, flagged_by)
             VALUES (?, ?, ?, ?)`,
            [id1, id2, similarityScore, userId]
          );

          if (similarityScore > 75) {
            newFlagsCount++;
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Plagiarism check completed. Scanned ${submissions.length} submissions and found ${newFlagsCount} new potential duplicate submission pairs.`,
      scanned_submissions: submissions.length,
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
    const homeworkId = Number(req.query.homework_id);

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
         AND h.is_active = true
         AND (? IS NULL OR h.homework_id = ?)
       ORDER BY pf.similarity_score DESC, pf.created_at DESC`,
      [classroomId, homeworkId || null, homeworkId || null]
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

// DELETE /api/classrooms/:id/plagiarism-flags - Clear all results for a classroom
const clearPlagiarismFlags = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const userId = req.user.user_id;
    const homeworkId = Number(req.query.homework_id);

    if (!(await isInstructorOrTA(userId, classroomId))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can clear plagiarism results' });
    }
    if (!homeworkId) {
      return res.status(400).json({ success: false, message: 'Please select a homework set before clearing plagiarism results' });
    }

    const [result] = await db.query(
        `DELETE pf
       FROM plagiarism_flags pf
       JOIN submissions s1 ON pf.submission_id_1 = s1.submission_id
       JOIN questions q ON s1.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
         WHERE h.classroom_id = ? AND h.homework_id = ?`,
        [classroomId, homeworkId]
    );

    res.json({ success: true, message: `Cleared ${result.affectedRows} plagiarism result(s).`, deleted_count: result.affectedRows });
  } catch (error) {
    console.error('Error clearing plagiarism flags:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  calculateSimilarity,
  runPlagiarismScan,
  getPlagiarismFlags,
  reviewPlagiarismFlag,
  clearPlagiarismFlags
};