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

// POST /api/classrooms/:id/live-sessions - Create Live Session
const createLiveSession = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const { session_title, session_description, scheduled_time, expected_duration } = req.body;
    const userId = req.user.user_id;

    if (!(await isInstructorOrTA(userId, classroomId))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can create live sessions' });
    }

    if (!session_title) {
      return res.status(400).json({ success: false, message: 'Session title is required' });
    }

    const jitsiRoomId = `classsync-room-${classroomId}-${Date.now().toString(36)}`;
    const scheduled = scheduled_time ? new Date(scheduled_time) : new Date();

    const [result] = await db.query(
      `INSERT INTO live_sessions (classroom_id, session_title, session_description, scheduled_time, expected_duration, jitsi_room_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [classroomId, session_title, session_description || '', scheduled, expected_duration || 60, jitsiRoomId, userId]
    );

    const sessionId = result.insertId;

    // Notify learners
    const [members] = await db.query(
      `SELECT user_id FROM classroom_members WHERE classroom_id = ? AND role = 'learner' AND is_active = true`,
      [classroomId]
    );
    for (const m of members) {
      await createNotification(
        m.user_id,
        'live_session',
        'Live Class Scheduled',
        `A new live class "${session_title}" has been scheduled.`,
        `/live.html?id=${sessionId}`
      );
    }

    res.status(201).json({
      success: true,
      message: 'Live session created successfully',
      data: {
        session_id: sessionId,
        jitsi_room_id: jitsiRoomId
      }
    });
  } catch (error) {
    console.error('Error creating live session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/live-sessions - List live sessions
const getClassroomLiveSessions = async (req, res) => {
  try {
    const classroomId = req.params.id;

    const [rows] = await db.query(
      `SELECT ls.*, u.full_name AS creator_name
       FROM live_sessions ls
       JOIN users u ON ls.created_by = u.user_id
       WHERE ls.classroom_id = ? AND ls.is_active = true
       ORDER BY ls.scheduled_time DESC`,
      [classroomId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching live sessions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/live-sessions/:id - Get live session details + attendance log
const getLiveSessionById = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.user_id;

    const [sessions] = await db.query(
      `SELECT ls.*, c.classroom_name, u.full_name AS creator_name
       FROM live_sessions ls
       JOIN classrooms c ON ls.classroom_id = c.classroom_id
       JOIN users u ON ls.created_by = u.user_id
       WHERE ls.session_id = ? AND ls.is_active = true`,
      [sessionId]
    );

    if (sessions.length === 0) return res.status(404).json({ success: false, message: 'Live session not found' });

    const session = sessions[0];
    const isStaff = await isInstructorOrTA(userId, session.classroom_id);

    // Fetch attendance list for instructor/TA or user's own status
    const [attendance] = await db.query(
      `SELECT a.*, u.full_name AS learner_name, u.email AS learner_email
       FROM attendance a
       JOIN users u ON a.learner_id = u.user_id
       WHERE a.session_id = ?
       ORDER BY u.full_name ASC`,
      [sessionId]
    );

    res.json({
      success: true,
      data: {
        ...session,
        is_staff: isStaff,
        attendance
      }
    });
  } catch (error) {
    console.error('Error fetching live session details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/live-sessions/:id/attendance - Duration Heartbeat / Join & Duration check
const recordAttendanceDuration = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { duration_minutes } = req.body;
    const learnerId = req.user.user_id;

    const [sessions] = await db.query(`SELECT expected_duration FROM live_sessions WHERE session_id = ?`, [sessionId]);
    if (sessions.length === 0) return res.status(404).json({ success: false, message: 'Live session not found' });

    const expectedDuration = sessions[0].expected_duration || 60;
    const duration = parseInt(duration_minutes || 0, 10);

    // Threshold check: 75% of expected duration
    const thresholdMinutes = Math.ceil(expectedDuration * 0.75);
    const isPresent = duration >= thresholdMinutes;

    const [existing] = await db.query(
      `SELECT attendance_id, duration_minutes FROM attendance WHERE session_id = ? AND learner_id = ?`,
      [sessionId, learnerId]
    );

    let attendanceId;
    if (existing.length > 0) {
      attendanceId = existing[0].attendance_id;
      const newDuration = Math.max(existing[0].duration_minutes || 0, duration);
      const newPresent = newDuration >= thresholdMinutes;

      await db.query(
        `UPDATE attendance
         SET leave_time = NOW(), duration_minutes = ?, is_present = ?
         WHERE attendance_id = ?`,
        [newDuration, newPresent, attendanceId]
      );
    } else {
      const [result] = await db.query(
        `INSERT INTO attendance (session_id, learner_id, join_time, leave_time, duration_minutes, is_present)
         VALUES (?, ?, NOW(), NOW(), ?, ?)`,
        [sessionId, learnerId, duration, isPresent]
      );
      attendanceId = result.insertId;
    }

    res.json({
      success: true,
      message: 'Attendance duration recorded',
      data: {
        attendance_id: attendanceId,
        duration_minutes: duration,
        is_present: isPresent,
        threshold_minutes: thresholdMinutes
      }
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/attendance/:id/override - Instructor override
const overrideAttendance = async (req, res) => {
  try {
    const attendanceId = req.params.id;
    const { override_present, override_reason } = req.body;
    const activeUserId = req.user.user_id;

    // Get attendance & classroom
    const [att] = await db.query(
      `SELECT a.session_id, ls.classroom_id
       FROM attendance a
       JOIN live_sessions ls ON a.session_id = ls.session_id
       WHERE a.attendance_id = ?`,
      [attendanceId]
    );

    if (att.length === 0) return res.status(404).json({ success: false, message: 'Attendance record not found' });

    if (!(await isInstructorOrTA(activeUserId, att[0].classroom_id))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can override attendance' });
    }

    await db.query(
      `UPDATE attendance
       SET instructor_override = true, override_present = ?, override_reason = ?
       WHERE attendance_id = ?`,
      [override_present ? true : false, override_reason || 'Instructor manual override', attendanceId]
    );

    res.json({ success: true, message: 'Attendance override applied' });
  } catch (error) {
    console.error('Error overriding attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createLiveSession,
  getClassroomLiveSessions,
  getLiveSessionById,
  recordAttendanceDuration,
  overrideAttendance
};
