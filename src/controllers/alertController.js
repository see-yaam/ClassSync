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

// POST /api/classrooms/:id/alerts - Issue alert
const createLearnerAlert = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const { learner_id, alert_type, alert_message } = req.body;
    const instructorId = req.user.user_id;

    if (!(await isInstructorOrTA(instructorId, classroomId))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can issue alerts' });
    }

    if (!learner_id || !['yellow', 'red'].includes(alert_type)) {
      return res.status(400).json({ success: false, message: 'learner_id and alert_type (yellow/red) are required' });
    }

    const finalMessage = (alert_message && alert_message.trim())
      ? alert_message.trim()
      : (alert_type === 'red' ? 'Red Warning Alert' : 'Yellow Warning Alert');

    // Auto-resolve any existing active alerts for this learner in this classroom so new alert overwrites previous alerts
    await db.query(
      `UPDATE learner_alerts
       SET is_resolved = true, resolved_at = NOW(), resolved_by = ?
       WHERE classroom_id = ? AND learner_id = ? AND (is_resolved = false OR is_resolved = 0)`,
      [instructorId, classroomId, learner_id]
    );

    const [result] = await db.query(
      `INSERT INTO learner_alerts (classroom_id, learner_id, instructor_id, alert_type, alert_message)
       VALUES (?, ?, ?, ?, ?)`,
      [classroomId, learner_id, instructorId, alert_type, finalMessage]
    );

    // Auto-create notification for learner
    await createNotification(
      learner_id,
      'alert',
      `${alert_type.toUpperCase()} ALERT Warning Issued`,
      `Instructor issued a ${alert_type} alert: ${finalMessage}`,
      `/classroom.html?id=${classroomId}`
    );

    res.status(201).json({
      success: true,
      message: `${alert_type.toUpperCase()} alert issued to learner successfully`,
      data: { alert_id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating learner alert:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/alerts - List alerts
const getClassroomAlerts = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const userId = req.user.user_id;

    const isStaff = await isInstructorOrTA(userId, classroomId);

    let query = `
      SELECT la.*, l.full_name AS learner_name, l.email AS learner_email, inst.full_name AS instructor_name, res.full_name AS resolver_name
      FROM learner_alerts la
      JOIN users l ON la.learner_id = l.user_id
      JOIN users inst ON la.instructor_id = inst.user_id
      LEFT JOIN users res ON la.resolved_by = res.user_id
      WHERE la.classroom_id = ?
    `;
    const queryParams = [classroomId];

    if (!isStaff) {
      query += ` AND la.learner_id = ?`;
      queryParams.push(userId);
    }

    query += ` ORDER BY la.created_at DESC`;

    const [rows] = await db.query(query, queryParams);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching learner alerts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/alerts/:id/resolve - Resolve alert
const resolveAlert = async (req, res) => {
  try {
    const alertId = req.params.id;
    const userId = req.user.user_id;

    const [alertRows] = await db.query(`SELECT classroom_id, learner_id FROM learner_alerts WHERE alert_id = ?`, [alertId]);
    if (alertRows.length === 0) return res.status(404).json({ success: false, message: 'Alert not found' });

    const { classroom_id, learner_id } = alertRows[0];

    if (!(await isInstructorOrTA(userId, classroom_id))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can resolve alerts' });
    }

    // Resolve ALL active alerts for this learner in this classroom
    await db.query(
      `UPDATE learner_alerts
       SET is_resolved = true, resolved_at = NOW(), resolved_by = ?
       WHERE classroom_id = ? AND learner_id = ? AND (is_resolved = false OR is_resolved = 0)`,
      [userId, classroom_id, learner_id]
    );

    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/classrooms/:id/learners/:learnerId/clear-alerts - Clear all active alerts for a learner
const clearLearnerAlerts = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const learnerId = req.params.learnerId;
    const userId = req.user.user_id;

    if (!(await isInstructorOrTA(userId, classroomId))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can clear alerts' });
    }

    await db.query(
      `UPDATE learner_alerts
       SET is_resolved = true, resolved_at = NOW(), resolved_by = ?
       WHERE classroom_id = ? AND learner_id = ? AND (is_resolved = false OR is_resolved = 0)`,
      [userId, classroomId, learnerId]
    );

    res.json({ success: true, message: 'Learner alerts cleared' });
  } catch (error) {
    console.error('Error clearing learner alerts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/me/alerts - All active alerts for the current learner (across all classrooms)
const getMyAlerts = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [rows] = await db.query(
      `SELECT la.alert_id, la.classroom_id, la.alert_type, la.alert_message,
              la.is_resolved, la.created_at,
              inst.full_name AS instructor_name,
              c.classroom_name
       FROM learner_alerts la
       JOIN users inst ON la.instructor_id = inst.user_id
       JOIN classrooms c ON la.classroom_id = c.classroom_id
       WHERE la.learner_id = ? AND (la.is_resolved = false OR la.is_resolved = 0)
       ORDER BY la.created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching my alerts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/alerts/nudge - Send reminder nudge to at-risk learner
const nudgeLearner = async (req, res) => {
  try {
    const { learner_id, classroom_id, message } = req.body;
    const instructorId = req.user.user_id;

    if (!learner_id || !classroom_id) {
      return res.status(400).json({ success: false, message: 'learner_id and classroom_id are required' });
    }

    if (!(await isInstructorOrTA(instructorId, classroom_id))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can send nudges' });
    }

    const nudgeMsg = message || 'Your instructor noticed you have upcoming or pending assignments. Please check your classroom portal to stay on track!';

    await createNotification(
      learner_id,
      'alert',
      '⏰ Instructor Study Reminder Nudge',
      nudgeMsg,
      `/classroom.html?id=${classroom_id}`
    );

    res.json({ success: true, message: 'Nudge notification sent to learner' });
  } catch (error) {
    console.error('Error sending nudge:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createLearnerAlert,
  getClassroomAlerts,
  resolveAlert,
  clearLearnerAlerts,
  getMyAlerts,
  nudgeLearner
};
