const db = require('../config/db');
const { createNotification } = require('../utils/notificationHelper');
const { evaluateAllTestCases } = require('../utils/pistonApi');

// 1. Create a new Quiz with questions, options, and coding test cases (Instructor)
exports.createQuiz = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      classroom_id,
      title,
      description,
      quiz_type,
      duration_minutes,
      start_time,
      end_time,
      questions
    } = req.body;

    const creator_id = req.user.user_id;

    if (!classroom_id || !title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Classroom ID, title, and at least 1 question are required.' });
    }

    // Verify creator is instructor/TA
    const [member] = await connection.query(
      `SELECT role FROM classroom_members WHERE classroom_id = ? AND user_id = ? AND is_active = true`,
      [classroom_id, creator_id]
    );
    if (!member.length || !['instructor', 'TA'].includes(member[0].role)) {
      return res.status(403).json({ success: false, message: 'Only instructors can create quizzes.' });
    }

    await connection.beginTransaction();

    // Calculate total marks
    let totalMarks = 0;
    questions.forEach(q => {
      totalMarks += parseInt(q.points || 5, 10);
    });

    const [quizResult] = await connection.query(
      `INSERT INTO quizzes (classroom_id, created_by, title, description, quiz_type, duration_minutes, start_time, end_time, total_marks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        classroom_id,
        creator_id,
        title,
        description || '',
        quiz_type || 'flexible',
        parseInt(duration_minutes || 15, 10),
        start_time ? new Date(start_time) : null,
        end_time ? new Date(end_time) : null,
        totalMarks
      ]
    );

    const quiz_id = quizResult.insertId;

    // Insert Questions, Options, and Test Cases
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qType = q.question_type || 'mcq';
      const [qResult] = await connection.query(
        `INSERT INTO quiz_questions (quiz_id, question_text, question_type, coding_language, starter_code, question_file_url, points, order_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quiz_id,
          q.question_text,
          qType,
          q.coding_language || 'python',
          q.starter_code || null,
          q.question_file_url || null,
          parseInt(q.points || 5, 10),
          i + 1
        ]
      );
      const question_id = qResult.insertId;

      if (qType === 'mcq' || qType === 'true_false') {
        if (q.options && Array.isArray(q.options)) {
          for (const opt of q.options) {
            await connection.query(
              `INSERT INTO quiz_options (question_id, option_text, is_correct)
               VALUES (?, ?, ?)`,
              [question_id, opt.option_text, opt.is_correct ? true : false]
            );
          }
        }
      } else if (qType === 'coding') {
        if (q.test_cases && Array.isArray(q.test_cases)) {
          for (const tc of q.test_cases) {
            await connection.query(
              `INSERT INTO quiz_test_cases (question_id, input_data, expected_output, is_hidden, points)
               VALUES (?, ?, ?, ?, ?)`,
              [question_id, tc.input_data || '', tc.expected_output || '', tc.is_hidden ? true : false, tc.points || 1]
            );
          }
        }
      }
    }

    await connection.commit();

    // Notify enrolled learners
    const [learners] = await connection.query(
      `SELECT user_id FROM classroom_members WHERE classroom_id = ? AND role = 'learner' AND is_active = true`,
      [classroom_id]
    );

    const typeLabel = quiz_type === 'live' ? 'Scheduled Live Exam' : 'Quiz';
    for (const l of learners) {
      await createNotification(
        l.user_id,
        'quiz',
        `New ${typeLabel}: ${title}`,
        `A new quiz "${title}" has been published for your class. Duration: ${duration_minutes} mins.`,
        `/classroom.html?id=${classroom_id}&tab=quizzes&quiz_id=${quiz_id}`
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Quiz created successfully!',
      quiz_id
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating quiz:', error);
    return res.status(500).json({ success: false, message: 'Server error creating quiz: ' + error.message });
  } finally {
    connection.release();
  }
};

const parseSafeDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    const cleanStr = val.replace(' ', 'T');
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

// 2. Get all quizzes for a classroom (Instructor / Student View)
exports.getClassroomQuizzes = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const userId = req.user.user_id;

    const [quizzes] = await db.query(
      `SELECT q.*, u.full_name as creator_name,
              qa.attempt_id, qa.status as attempt_status, qa.approval_status, qa.total_score, qa.started_at, qa.submitted_at
       FROM quizzes q
       JOIN users u ON q.created_by = u.user_id
       LEFT JOIN quiz_attempts qa ON q.quiz_id = qa.quiz_id AND qa.learner_id = ?
       WHERE q.classroom_id = ? AND q.is_published = true
       ORDER BY q.created_at DESC`,
      [userId, classroomId]
    );

    const now = new Date();
    const formatted = quizzes.map(q => {
      let is_available = true;
      let window_status = 'active';

      const startDate = parseSafeDate(q.start_time);
      const endDate = parseSafeDate(q.end_time);

      if (startDate && startDate > now) {
        is_available = false;
        window_status = 'upcoming';
      } else if (endDate && endDate < now) {
        is_available = false;
        window_status = 'closed';
      }

      return {
        ...q,
        is_available,
        window_status
      };
    });

    return res.json({ success: true, quizzes: formatted });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching quizzes.' });
  }
};

// 3. Start or Resume Quiz Attempt (Learner)
exports.startQuizAttempt = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { quizId } = req.params;
    const learner_id = req.user.user_id;

    const [quizzes] = await connection.query(
      `SELECT * FROM quizzes WHERE quiz_id = ? AND is_published = true`,
      [quizId]
    );

    if (!quizzes.length) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const quiz = quizzes[0];
    const now = new Date();

    // Block Instructors & TAs from attempting quizzes in their classroom
    const [membership] = await connection.query(
      `SELECT role FROM classroom_members WHERE classroom_id = ? AND user_id = ? AND is_active = true`,
      [quiz.classroom_id, learner_id]
    );

    if (membership.length && ['instructor', 'ta'].includes((membership[0].role || '').toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: 'Instructors and TAs cannot attempt quizzes in their own classroom.'
      });
    }

    const startDate = parseSafeDate(quiz.start_time);
    const endDate = parseSafeDate(quiz.end_time);

    // Check time windows: If not started yet, return not_started status with countdown
    if (startDate && startDate > now) {
      const secondsUntilStart = Math.floor((startDate.getTime() - now.getTime()) / 1000);
      return res.json({
        success: true,
        not_started: true,
        quiz,
        start_time: quiz.start_time,
        seconds_until_start: secondsUntilStart,
        message: `Quiz has not started yet. It will open at ${startDate.toLocaleString()}`
      });
    }

    if (endDate && endDate < now) {
      return res.status(400).json({
        success: false,
        message: 'This quiz window has closed.'
      });
    }

    // Check existing attempt
    let [attempts] = await connection.query(
      `SELECT * FROM quiz_attempts WHERE quiz_id = ? AND learner_id = ?`,
      [quizId, learner_id]
    );

    let attempt;
    let remaining_seconds = 0;
    const nowTime = Date.now();
    const durationMs = quiz.duration_minutes * 60 * 1000;

    if (!attempts.length) {
      // Brand new attempt calculation
      let totalAllowedExpiryMs = nowTime + durationMs;
      if (endDate && endDate.getTime() < totalAllowedExpiryMs) {
        totalAllowedExpiryMs = endDate.getTime();
      }
      remaining_seconds = Math.floor((totalAllowedExpiryMs - nowTime) / 1000);

      if (remaining_seconds <= 0) {
        return res.status(400).json({
          success: false,
          message: 'This quiz window has closed or expired.'
        });
      }

      // Create new attempt ONLY when valid
      const [attemptResult] = await connection.query(
        `INSERT INTO quiz_attempts (quiz_id, learner_id, started_at, status) VALUES (?, ?, NOW(), 'in_progress')`,
        [quizId, learner_id]
      );
      const [newAttempt] = await connection.query(
        `SELECT * FROM quiz_attempts WHERE attempt_id = ?`,
        [attemptResult.insertId]
      );
      attempt = newAttempt[0];
    } else {
      attempt = attempts[0];
      if (attempt.status === 'submitted' || attempt.status === 'time_expired') {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted this exam.',
          attempt
        });
      }

      const startedAt = parseSafeDate(attempt.started_at)?.getTime() || nowTime;
      let totalAllowedExpiryMs;
      if (quiz.quiz_type === 'live') {
        totalAllowedExpiryMs = endDate ? endDate.getTime() : startedAt + durationMs;
      } else {
        totalAllowedExpiryMs = startedAt + durationMs;
        if (endDate && endDate.getTime() < totalAllowedExpiryMs) {
          totalAllowedExpiryMs = endDate.getTime();
        }
      }

      remaining_seconds = Math.floor((totalAllowedExpiryMs - nowTime) / 1000);

      if (remaining_seconds <= 0) {
        await connection.query(
          `UPDATE quiz_attempts SET status = 'time_expired', submitted_at = NOW() WHERE attempt_id = ?`,
          [attempt.attempt_id]
        );
        return res.status(400).json({
          success: false,
          message: 'Exam time has expired.',
          status: 'time_expired'
        });
      }
    }

    // Fetch Questions, Options, and Test Cases
    const [questions] = await connection.query(
      `SELECT question_id, quiz_id, question_text, question_type, coding_language, starter_code, question_file_url, points, order_number
       FROM quiz_questions WHERE quiz_id = ? ORDER BY order_number ASC`,
      [quizId]
    );

    for (const q of questions) {
      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        const [options] = await connection.query(
          `SELECT option_id, question_id, option_text FROM quiz_options WHERE question_id = ?`,
          [q.question_id]
        );
        q.options = options;
      } else if (q.question_type === 'coding') {
        const [tcs] = await connection.query(
          `SELECT test_case_id, input_data, expected_output, is_hidden, points FROM quiz_test_cases WHERE question_id = ?`,
          [q.question_id]
        );
        q.test_cases = tcs;
      }
    }

    // Fetch saved progress for refresh restoration
    const [savedAnswers] = await connection.query(
      `SELECT question_id, selected_option_id, answer_text, coding_language FROM quiz_answers WHERE attempt_id = ?`,
      [attempt.attempt_id]
    );

    return res.json({
      success: true,
      quiz: {
        quiz_id: quiz.quiz_id,
        title: quiz.title,
        description: quiz.description,
        quiz_type: quiz.quiz_type,
        duration_minutes: quiz.duration_minutes,
        total_marks: quiz.total_marks
      },
      attempt_id: attempt.attempt_id,
      started_at: attempt.started_at,
      remaining_seconds,
      questions,
      savedAnswers
    });
  } catch (error) {
    console.error('Error starting quiz attempt:', error);
    return res.status(500).json({ success: false, message: 'Server error starting quiz attempt.' });
  } finally {
    connection.release();
  }
};

// 4. Real-time Save Answer Progress (Learner)
exports.saveAnswerProgress = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { question_id, selected_option_id, answer_text, coding_language } = req.body;
    const learner_id = req.user.user_id;

    // Verify attempt ownership & status
    const [attempts] = await db.query(
      `SELECT * FROM quiz_attempts WHERE attempt_id = ? AND learner_id = ?`,
      [attemptId, learner_id]
    );

    if (!attempts.length || attempts[0].status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Attempt not active or not found.' });
    }

    // Upsert into quiz_answers
    const [existing] = await db.query(
      `SELECT answer_id FROM quiz_answers WHERE attempt_id = ? AND question_id = ?`,
      [attemptId, question_id]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE quiz_answers SET selected_option_id = ?, answer_text = ?, coding_language = ? WHERE attempt_id = ? AND question_id = ?`,
        [selected_option_id || null, answer_text || null, coding_language || null, attemptId, question_id]
      );
    } else {
      await db.query(
        `INSERT INTO quiz_answers (attempt_id, question_id, selected_option_id, answer_text, coding_language) VALUES (?, ?, ?, ?, ?)`,
        [attemptId, question_id, selected_option_id || null, answer_text || null, coding_language || null]
      );
    }

    return res.json({ success: true, message: 'Progress saved.' });
  } catch (error) {
    console.error('Error saving progress:', error);
    return res.status(500).json({ success: false, message: 'Server error saving progress.' });
  }
};

// 5. Submit Quiz Attempt, Auto-Grade MCQs & Auto-Evaluate Code via Piston API (Learner / Timer Trigger)
exports.submitQuizAttempt = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { attemptId } = req.params;
    const { answers, is_time_expired } = req.body;
    const learner_id = req.user.user_id;

    const [attempts] = await connection.query(
      `SELECT * FROM quiz_attempts WHERE attempt_id = ? AND learner_id = ?`,
      [attemptId, learner_id]
    );

    if (!attempts.length) {
      return res.status(404).json({ success: false, message: 'Attempt not found.' });
    }

    const attempt = attempts[0];
    if (attempt.status === 'submitted' || attempt.status === 'time_expired') {
      return res.status(200).json({
        success: true,
        message: 'Exam already submitted.',
        total_score: attempt.total_score
      });
    }

    await connection.beginTransaction();

    // Save answers payload first if provided
    if (answers && Array.isArray(answers)) {
      for (const ans of answers) {
        const [existing] = await connection.query(
          `SELECT answer_id FROM quiz_answers WHERE attempt_id = ? AND question_id = ?`,
          [attemptId, ans.question_id]
        );
        if (existing.length > 0) {
          await connection.query(
            `UPDATE quiz_answers SET selected_option_id = ?, answer_text = ?, coding_language = ? WHERE attempt_id = ? AND question_id = ?`,
            [ans.selected_option_id || null, ans.answer_text || null, ans.coding_language || null, attemptId, ans.question_id]
          );
        } else {
          await connection.query(
            `INSERT INTO quiz_answers (attempt_id, question_id, selected_option_id, answer_text, coding_language) VALUES (?, ?, ?, ?, ?)`,
            [attemptId, ans.question_id, ans.selected_option_id || null, ans.answer_text || null, ans.coding_language || null]
          );
        }
      }
    }

    // Grade Questions (MCQs & Coding Questions)
    const [allQuestions] = await connection.query(
      `SELECT question_id, points, question_type, coding_language FROM quiz_questions WHERE quiz_id = ?`,
      [attempt.quiz_id]
    );

    let totalScore = 0;
    let hasManualGradingQuestion = false;

    for (const q of allQuestions) {
      const [ansRows] = await connection.query(
        `SELECT selected_option_id, answer_text, coding_language FROM quiz_answers WHERE attempt_id = ? AND question_id = ?`,
        [attemptId, q.question_id]
      );

      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        if (ansRows.length > 0 && ansRows[0].selected_option_id) {
          const selectedOptId = ansRows[0].selected_option_id;

          const [optRows] = await connection.query(
            `SELECT is_correct FROM quiz_options WHERE option_id = ?`,
            [selectedOptId]
          );

          if (optRows.length > 0 && optRows[0].is_correct) {
            const pointsAwarded = parseFloat(q.points || 5);
            totalScore += pointsAwarded;

            await connection.query(
              `UPDATE quiz_answers SET is_correct = true, marks_awarded = ? WHERE attempt_id = ? AND question_id = ?`,
              [pointsAwarded, attemptId, q.question_id]
            );
          } else {
            await connection.query(
              `UPDATE quiz_answers SET is_correct = false, marks_awarded = 0 WHERE attempt_id = ? AND question_id = ?`,
              [attemptId, q.question_id]
            );
          }
        }
      } else if (q.question_type === 'coding') {
        const codeContent = ansRows.length > 0 ? (ansRows[0].answer_text || '') : '';
        const studentLang = (ansRows.length > 0 && ansRows[0].coding_language) ? ansRows[0].coding_language : (q.coding_language || 'python');

        // Run Piston API code evaluation against test cases using student's chosen language
        const [testCases] = await connection.query(
          `SELECT test_case_id, input_data, expected_output, is_hidden, points FROM quiz_test_cases WHERE question_id = ?`,
          [q.question_id]
        );

        if (codeContent.trim() && testCases.length > 0) {
          try {
            const evalResults = await evaluateAllTestCases(codeContent, studentLang, testCases);
            let codeScore = 0;
            evalResults.forEach(r => {
              if (r.passed) codeScore += parseFloat(r.points || 1);
            });
            totalScore += codeScore;

            await connection.query(
              `UPDATE quiz_answers SET is_correct = ?, marks_awarded = ? WHERE attempt_id = ? AND question_id = ?`,
              [codeScore > 0, codeScore, attemptId, q.question_id]
            );
          } catch (evalErr) {
            console.error('Coding question eval error:', evalErr.message);
          }
        }
      } else if (q.question_type === 'file') {
        hasManualGradingQuestion = true;
      }
    }

    const finalStatus = is_time_expired ? 'time_expired' : 'submitted';
    // If quiz contains coding or file questions, set approval_status to 'pending' until teacher approves!
    const approvalStatus = hasManualGradingQuestion ? 'pending' : 'approved';

    await connection.query(
      `UPDATE quiz_attempts SET status = ?, approval_status = ?, submitted_at = NOW(), total_score = ? WHERE attempt_id = ?`,
      [finalStatus, approvalStatus, totalScore, attemptId]
    );

    await connection.commit();

    const [quizInfo] = await db.query(`SELECT total_marks FROM quizzes WHERE quiz_id = ?`, [attempt.quiz_id]);

    return res.json({
      success: true,
      message: is_time_expired ? 'Time expired. Answers auto-submitted.' : 'Quiz submitted successfully!',
      approval_status: approvalStatus,
      total_score: approvalStatus === 'approved' ? totalScore : null, // Hide score if pending teacher approval!
      total_marks: quizInfo.length ? quizInfo[0].total_marks : 0,
      status: finalStatus
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error submitting quiz:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting quiz.' });
  } finally {
    connection.release();
  }
};

// 6. Teacher Approve Quiz Grade / Evaluation (Instructor)
exports.approveQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { score } = req.body;
    const instructor_id = req.user.user_id;

    const [attempts] = await db.query(
      `SELECT qa.*, q.title as quiz_title, q.classroom_id FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.quiz_id WHERE qa.attempt_id = ?`,
      [attemptId]
    );

    if (!attempts.length) {
      return res.status(404).json({ success: false, message: 'Attempt not found.' });
    }

    const attempt = attempts[0];

    // Verify instructor
    const [members] = await db.query(
      `SELECT role FROM classroom_members WHERE classroom_id = ? AND user_id = ? AND is_active = true`,
      [attempt.classroom_id, instructor_id]
    );
    if (!members.length || !['instructor', 'TA'].includes(members[0].role)) {
      return res.status(403).json({ success: false, message: 'Only instructors can approve grades.' });
    }

    const finalScore = (score !== undefined && score !== null && score !== '') ? parseFloat(score) : (attempt.total_score || 0);

    await db.query(
      `UPDATE quiz_attempts SET total_score = ?, approval_status = 'approved' WHERE attempt_id = ?`,
      [finalScore, attemptId]
    );

    // Notify student
    await createNotification(
      attempt.learner_id,
      'quiz',
      `Quiz Grade Released: ${attempt.quiz_title}`,
      `Your instructor has approved your quiz submission. Final Score: ${finalScore}`,
      `/classroom.html?id=${attempt.classroom_id}&tab=quizzes`
    );

    return res.json({ success: true, message: 'Quiz grade approved and score released to student!', total_score: finalScore });
  } catch (error) {
    console.error('Error approving quiz attempt:', error);
    return res.status(500).json({ success: false, message: 'Server error approving grade.' });
  }
};

// 7. Get Quiz Leaderboard & Submissions (Instructor / Student Review)
exports.getQuizLeaderboard = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.user_id;

    const [quizRows] = await db.query(
      `SELECT q.*, c.classroom_name FROM quizzes q JOIN classrooms c ON q.classroom_id = c.classroom_id WHERE q.quiz_id = ?`,
      [quizId]
    );

    if (!quizRows.length) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const quiz = quizRows[0];

    const [members] = await db.query(
      `SELECT role FROM classroom_members WHERE classroom_id = ? AND user_id = ? AND is_active = true`,
      [quiz.classroom_id, userId]
    );

    const isStaff = members.length > 0 && ['instructor', 'TA'].includes(members[0].role);

    const [attempts] = await db.query(
      `SELECT qa.attempt_id, qa.started_at, qa.submitted_at, qa.status, qa.approval_status, qa.total_score,
              u.user_id, u.full_name, u.email, u.profile_picture_url,
              TIMESTAMPDIFF(SECOND, qa.started_at, qa.submitted_at) as duration_seconds
       FROM quiz_attempts qa
       JOIN users u ON qa.learner_id = u.user_id
       WHERE qa.quiz_id = ?
       ORDER BY qa.total_score DESC, duration_seconds ASC`,
      [quizId]
    );

    if (isStaff) {
      for (const att of attempts) {
        const [ans] = await db.query(
          `SELECT qa.question_id, qa.selected_option_id, qa.answer_text, qa.coding_language, qa.marks_awarded, qa.is_correct,
                  qq.question_text, qq.question_type, qq.question_file_url, qq.points
           FROM quiz_answers qa
           JOIN quiz_questions qq ON qa.question_id = qq.question_id
           WHERE qa.attempt_id = ?`,
          [att.attempt_id]
        );
        att.answers = ans;
      }
    }

    // For students, hide total_score if approval_status === 'pending'
    const safeLeaderboard = attempts.map(att => {
      if (!isStaff && att.user_id === userId && att.approval_status === 'pending') {
        return {
          ...att,
          total_score: 'Pending Approval'
        };
      }
      return att;
    });

    // Fetch Question Answer Key
    const [questions] = await db.query(
      `SELECT question_id, question_text, question_type, question_file_url, points FROM quiz_questions WHERE quiz_id = ? ORDER BY order_number ASC`,
      [quizId]
    );

    for (const q of questions) {
      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        const [options] = await db.query(
          `SELECT option_id, option_text, is_correct FROM quiz_options WHERE question_id = ?`,
          [q.question_id]
        );
        q.options = options;
      }
    }

    return res.json({
      success: true,
      quiz,
      isStaff,
      leaderboard: safeLeaderboard,
      questions
    });
  } catch (error) {
    console.error('Error fetching quiz leaderboard:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching leaderboard.' });
  }
};

// 8. Get Single Quiz Details for Editing
exports.getQuizDetails = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.user_id;

    const [quizzes] = await db.query(`SELECT * FROM quizzes WHERE quiz_id = ? AND is_published = true`, [quizId]);
    if (!quizzes.length) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const quiz = quizzes[0];
    const [membership] = await db.query(
      `SELECT role FROM classroom_members WHERE classroom_id = ? AND user_id = ? AND is_active = true`,
      [quiz.classroom_id, userId]
    );
    if (!membership.length || !['instructor', 'TA'].includes(membership[0].role)) {
      return res.status(403).json({ success: false, message: 'Only instructors can edit quizzes.' });
    }

    const [questions] = await db.query(
      `SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_number ASC`,
      [quizId]
    );

    for (const q of questions) {
      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        const [options] = await db.query(`SELECT * FROM quiz_options WHERE question_id = ?`, [q.question_id]);
        q.options = options;
      } else if (q.question_type === 'coding') {
        const [testCases] = await db.query(`SELECT * FROM quiz_test_cases WHERE question_id = ?`, [q.question_id]);
        q.test_cases = testCases;
      }
    }

    return res.json({ success: true, quiz, questions });
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching quiz details.' });
  }
};

// 9. Update Quiz (Instructor)
exports.updateQuiz = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { quizId } = req.params;
    const userId = req.user.user_id;
    const { title, description, quiz_type, duration_minutes, start_time, end_time, questions } = req.body;

    const [quizzes] = await connection.query(`SELECT * FROM quizzes WHERE quiz_id = ?`, [quizId]);
    if (!quizzes.length) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const quiz = quizzes[0];
    const [membership] = await connection.query(
      `SELECT role FROM classroom_members WHERE classroom_id = ? AND user_id = ? AND is_active = true`,
      [quiz.classroom_id, userId]
    );
    if (!membership.length || !['instructor', 'TA'].includes(membership[0].role)) {
      return res.status(403).json({ success: false, message: 'Only instructors can update quizzes.' });
    }

    await connection.beginTransaction();

    let totalMarks = 0;
    if (Array.isArray(questions)) {
      questions.forEach(q => { totalMarks += parseInt(q.points || 10, 10); });
    }

    await connection.query(
      `UPDATE quizzes SET title = ?, description = ?, quiz_type = ?, duration_minutes = ?, total_marks = ?, start_time = ?, end_time = ? WHERE quiz_id = ?`,
      [title.trim(), description || null, quiz_type || 'flexible', duration_minutes || 30, totalMarks, start_time || null, end_time || null, quizId]
    );

    if (questions && Array.isArray(questions) && questions.length > 0) {
      const [oldQs] = await connection.query(`SELECT question_id FROM quiz_questions WHERE quiz_id = ?`, [quizId]);
      for (const oq of oldQs) {
        await connection.query(`DELETE FROM quiz_options WHERE question_id = ?`, [oq.question_id]);
        await connection.query(`DELETE FROM quiz_test_cases WHERE question_id = ?`, [oq.question_id]);
      }
      await connection.query(`DELETE FROM quiz_questions WHERE quiz_id = ?`, [quizId]);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const [qResult] = await connection.query(
          `INSERT INTO quiz_questions (quiz_id, question_text, question_type, starter_code, question_file_url, points, order_number) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [quizId, q.question_text, q.question_type || 'mcq', q.starter_code || null, q.question_file_url || null, q.points || 10, i + 1]
        );
        const questionId = qResult.insertId;

        if (q.question_type === 'mcq' && Array.isArray(q.options)) {
          for (const opt of q.options) {
            await connection.query(
              `INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES (?, ?, ?)`,
              [questionId, opt.option_text, opt.is_correct || false]
            );
          }
        } else if (q.question_type === 'coding' && Array.isArray(q.test_cases)) {
          for (const tc of q.test_cases) {
            await connection.query(
              `INSERT INTO quiz_test_cases (question_id, input_data, expected_output, is_hidden, points) VALUES (?, ?, ?, ?, ?)`,
              [questionId, tc.input_data || '', tc.expected_output || '', tc.is_hidden || false, tc.points || 5]
            );
          }
        }
      }
    }

    await connection.commit();
    return res.json({ success: true, message: 'Quiz updated successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating quiz:', error);
    return res.status(500).json({ success: false, message: 'Server error updating quiz.' });
  } finally {
    connection.release();
  }
};

// 10. Delete Quiz (Instructor)
exports.deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.user_id;

    const [quizzes] = await db.query(`SELECT classroom_id FROM quizzes WHERE quiz_id = ?`, [quizId]);
    if (!quizzes.length) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const [membership] = await db.query(
      `SELECT role FROM classroom_members WHERE classroom_id = ? AND user_id = ? AND is_active = true`,
      [quizzes[0].classroom_id, userId]
    );
    if (!membership.length || !['instructor', 'TA'].includes(membership[0].role)) {
      return res.status(403).json({ success: false, message: 'Only instructors can delete quizzes.' });
    }

    await db.query(`UPDATE quizzes SET is_published = false WHERE quiz_id = ?`, [quizId]);
    return res.json({ success: true, message: 'Quiz deleted successfully.' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting quiz.' });
  }
};

