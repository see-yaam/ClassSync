const db = require('../config/db');

// GET /api/classrooms/:id/leaderboard - Rank learners + calculate streak
const getLeaderboard = async (req, res) => {
  try {
    const classroomId = req.params.id;

    // Get classroom learners
    const [learners] = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.profile_picture_url
       FROM classroom_members cm
       JOIN users u ON cm.user_id = u.user_id
       WHERE cm.classroom_id = ? AND cm.role IN ('learner', 'TA') AND cm.is_active = true`,
      [classroomId]
    );

    // Get published homeworks ordered by creation date
    const [homeworks] = await db.query(
      `SELECT homework_id, total_points FROM homework WHERE classroom_id = ? AND is_published = true ORDER BY created_at ASC`,
      [classroomId]
    );

    const leaderboardData = [];

    for (const learner of learners) {
      // Calculate total score sum across all graded submissions
      const [scoreRow] = await db.query(
        `SELECT SUM(g.score) AS total_score, COUNT(DISTINCT s.question_id) AS submitted_questions
         FROM submissions s
         JOIN questions q ON s.question_id = q.question_id
         JOIN homework h ON q.homework_id = h.homework_id
         JOIN grades g ON s.submission_id = g.submission_id
         WHERE h.classroom_id = ? AND s.learner_id = ? AND g.is_draft = false`,
        [classroomId, learner.user_id]
      );

      const totalScore = parseFloat(scoreRow[0].total_score || 0);

      // Calculate streak: consecutive homework sets where learner achieved full marks
      let currentStreak = 0;
      // Loop homeworks in reverse (most recent first)
      const reversedHw = [...homeworks].reverse();
      for (const hw of reversedHw) {
        // Calculate max points for this homework
        const [qSum] = await db.query(`SELECT SUM(points) AS max_pts FROM questions WHERE homework_id = ?`, [hw.homework_id]);
        const maxPoints = parseFloat(qSum[0].max_pts || 0);

        if (maxPoints === 0) continue;

        // Calculate earned points by learner for this homework
        const [eSum] = await db.query(
          `SELECT SUM(g.score) AS earned_pts
           FROM submissions s
           JOIN questions q ON s.question_id = q.question_id
           JOIN grades g ON s.submission_id = g.submission_id
           WHERE q.homework_id = ? AND s.learner_id = ? AND g.is_draft = false`,
          [hw.homework_id, learner.user_id]
        );

        const earnedPoints = parseFloat(eSum[0].earned_pts || 0);

        if (earnedPoints >= maxPoints && maxPoints > 0) {
          currentStreak++;
        } else {
          break; // streak breaks if not full marks
        }
      }

      leaderboardData.push({
        learner_id: learner.user_id,
        full_name: learner.full_name,
        email: learner.email,
        profile_picture_url: learner.profile_picture_url,
        total_score: totalScore,
        streak: currentStreak
      });
    }

    // Sort by total score DESC
    leaderboardData.sort((a, b) => b.total_score - a.total_score || b.streak - a.streak);

    // Assign rank
    leaderboardData.forEach((item, index) => {
      item.rank = index + 1;
    });

    res.json({ success: true, data: leaderboardData });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/health - Class Health Dashboard statistics
const getClassHealth = async (req, res) => {
  try {
    const classroomId = req.params.id;

    // 1. Total Submissions & Late Rate
    const [subStats] = await db.query(
      `SELECT COUNT(*) AS total_submissions,
              SUM(CASE WHEN s.is_late = true THEN 1 ELSE 0 END) AS late_submissions
       FROM submissions s
       JOIN questions q ON s.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
       WHERE h.classroom_id = ?`,
      [classroomId]
    );

    const totalSub = subStats[0].total_submissions || 0;
    const lateSub = subStats[0].late_submissions || 0;
    const lateRatePercent = totalSub > 0 ? ((lateSub / totalSub) * 100).toFixed(1) : 0;

    // 2. Attendance Trend
    const [attStats] = await db.query(
      `SELECT COUNT(*) AS total_records,
              SUM(CASE WHEN a.is_present = true OR (a.instructor_override = true AND a.override_present = true) THEN 1 ELSE 0 END) AS present_records
       FROM attendance a
       JOIN live_sessions ls ON a.session_id = ls.session_id
       WHERE ls.classroom_id = ?`,
      [classroomId]
    );

    const totalAttRecords = attStats[0].total_records || 0;
    const presentRecords = attStats[0].present_records || 0;
    const attendanceRatePercent = totalAttRecords > 0 ? ((presentRecords / totalAttRecords) * 100).toFixed(1) : 0;

    // 3. At-Risk Learners (late submissions rate > 30% OR score avg < 50% OR active red/yellow alerts)
    const [learners] = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.profile_picture_url,
              (SELECT COUNT(*) FROM learner_alerts la WHERE la.learner_id = u.user_id AND la.classroom_id = ? AND la.is_resolved = false) AS unresolved_alerts,
              (SELECT alert_type FROM learner_alerts la WHERE la.learner_id = u.user_id AND la.classroom_id = ? AND la.is_resolved = false ORDER BY alert_id DESC LIMIT 1) AS highest_alert
       FROM classroom_members cm
       JOIN users u ON cm.user_id = u.user_id
       WHERE cm.classroom_id = ? AND cm.role = 'learner' AND cm.is_active = true`,
      [classroomId, classroomId, classroomId]
    );

    const atRiskLearners = [];

    for (const l of learners) {
      const [lSub] = await db.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN s.is_late = true THEN 1 ELSE 0 END) AS late_cnt
         FROM submissions s
         JOIN questions q ON s.question_id = q.question_id
         JOIN homework h ON q.homework_id = h.homework_id
         WHERE h.classroom_id = ? AND s.learner_id = ?`,
        [classroomId, l.user_id]
      );

      const [lGrade] = await db.query(
        `SELECT AVG(g.score) AS avg_score
         FROM grades g
         JOIN submissions s ON g.submission_id = s.submission_id
         JOIN questions q ON s.question_id = q.question_id
         JOIN homework h ON q.homework_id = h.homework_id
         WHERE h.classroom_id = ? AND s.learner_id = ? AND g.is_draft = false`,
        [classroomId, l.user_id]
      );

      const lateCount = lSub[0].late_cnt || 0;
      const totalCount = lSub[0].total || 0;
      const avgScore = lGrade[0].avg_score !== null ? parseFloat(lGrade[0].avg_score).toFixed(1) : null;
      const hasUnresolved = l.unresolved_alerts > 0;

      const isAtRisk = hasUnresolved || (totalCount > 0 && lateCount / totalCount > 0.3) || (avgScore !== null && avgScore < 50);

      if (isAtRisk) {
        atRiskLearners.push({
          user_id: l.user_id,
          full_name: l.full_name,
          email: l.email,
          late_count: lateCount,
          avg_score: avgScore,
          highest_alert: l.highest_alert || (hasUnresolved ? 'yellow' : null)
        });
      }
    }

    res.json({
      success: true,
      data: {
        total_submissions: totalSub,
        late_submissions: lateSub,
        late_rate_percent: parseFloat(lateRatePercent),
        attendance_rate_percent: parseFloat(attendanceRatePercent),
        at_risk_count: atRiskLearners.length,
        at_risk_learners: atRiskLearners
      }
    });
  } catch (error) {
    console.error('Error computing class health:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getLeaderboard,
  getClassHealth
};
