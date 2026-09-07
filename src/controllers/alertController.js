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

    if (!learner_id || !['yellow', 'red'].includes(alert_type) || !alert_message) {
      return res.status(400).json({ success: false, message: 'learner_id, alert_type (yellow/red), and alert_message are required' });
    }

    const [result] = await db.query(
      `INSERT INTO learner_alerts (classroom_id, learner_id, instructor_id, alert_type, alert_message)
       VALUES (?, ?, ?, ?, ?)`,
      [classroomId, learner_id, instructorId, alert_type, alert_message]
    );

    // Auto-create notification for learner
    await createNotification(
      learner_id,
      'alert',
      `${alert_type.toUpperCase()} ALERT Warning Issued`,
      `Instructor issued a ${alert_type} alert: ${alert_message}`,
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

    if (!isStaff) {
      query += ` AND la.learner_id = ${parseInt(userId)}`;
    }

    query += ` ORDER BY la.created_at DESC`;

    const [rows] = await db.query(query, [classroomId]);
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

    const [alertRows] = await db.query(`SELECT classroom_id FROM learner_alerts WHERE alert_id = ?`, [alertId]);
    if (alertRows.length === 0) return res.status(404).json({ success: false, message: 'Alert not found' });

    if (!(await isInstructorOrTA(userId, alertRows[0].classroom_id))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can resolve alerts' });
    }

    await db.query(
      `UPDATE learner_alerts SET is_resolved = true, resolved_at = NOW(), resolved_by = ? WHERE alert_id = ?`,
      [userId, alertId]
    );

    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createLearnerAlert,
  getClassroomAlerts,
  resolveAlert
};
