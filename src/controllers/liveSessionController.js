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

    // Notify enrolled learners with classroom name and scheduled time
    const [classroomInfo] = await db.query(`SELECT classroom_name FROM classrooms WHERE classroom_id = ?`, [classroomId]);
    const classroomName = classroomInfo.length > 0 ? classroomInfo[0].classroom_name : 'your classroom';
    const formattedTime = new Date(scheduled).toLocaleString();

    const [members] = await db.query(
      `SELECT user_id FROM classroom_members WHERE classroom_id = ? AND role = 'learner' AND is_active = true`,
      [classroomId]
    );
    for (const m of members) {
      await createNotification(
        m.user_id,
        'live_session',
        'Live Class Scheduled',
        `Live class "${session_title}" scheduled for ${classroomName} at ${formattedTime}`,
        `/classroom.html?id=${classroomId}`
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

// PUT /api/live-sessions/:id - Update a scheduled live session (creator instructor only)
const updateLiveSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.user_id;
    const { session_title, session_description, scheduled_time, expected_duration } = req.body;

    const [sessions] = await db.query(
      `SELECT classroom_id, created_by, started_at, ended_at
       FROM live_sessions
       WHERE session_id = ? AND is_active = true`,
      [sessionId]
    );

    if (sessions.length === 0) return res.status(404).json({ success: false, message: 'Live session not found' });
    const session = sessions[0];

    if (Number(session.created_by) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Only the instructor who created this session can edit it' });
    }
    if (session.started_at || session.ended_at) {
      return res.status(400).json({ success: false, message: 'Only scheduled sessions can be edited' });
    }
    if (!session_title || !session_title.trim()) {
      return res.status(400).json({ success: false, message: 'Session title is required' });
    }

    const duration = parseInt(expected_duration, 10);
    if (!Number.isInteger(duration) || duration < 1) {
      return res.status(400).json({ success: false, message: 'Expected duration must be at least 1 minute' });
    }

    const scheduled = scheduled_time ? new Date(scheduled_time) : null;
    if (!scheduled || Number.isNaN(scheduled.getTime())) {
      return res.status(400).json({ success: false, message: 'A valid scheduled time is required' });
    }

    await db.query(
      `UPDATE live_sessions
       SET session_title = ?, session_description = ?, scheduled_time = ?, expected_duration = ?
       WHERE session_id = ? AND is_active = true`,
      [session_title.trim(), session_description || '', scheduled, duration, sessionId]
    );

    res.json({ success: true, message: 'Live session updated successfully' });
  } catch (error) {
    console.error('Error updating live session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/live-sessions/:id - Soft-delete a scheduled live session (creator instructor only)
const deleteLiveSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.user_id;

    const [sessions] = await db.query(
      `SELECT created_by, started_at, ended_at
       FROM live_sessions
       WHERE session_id = ? AND is_active = true`,
      [sessionId]
    );

    if (sessions.length === 0) return res.status(404).json({ success: false, message: 'Live session not found' });
    const session = sessions[0];

    if (Number(session.created_by) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Only the instructor who created this session can delete it' });
    }
    if (session.started_at || session.ended_at) {
      return res.status(400).json({ success: false, message: 'Only scheduled sessions can be deleted' });
    }

    await db.query(
      `UPDATE live_sessions SET is_active = false WHERE session_id = ? AND is_active = true`,
      [sessionId]
    );

    res.json({ success: true, message: 'Live session deleted successfully' });
  } catch (error) {
    console.error('Error deleting live session:', error);
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

    const [sessions] = await db.query(
      `SELECT ls.expected_duration, c.attendance_threshold_percent
       FROM live_sessions ls
       JOIN classrooms c ON ls.classroom_id = c.classroom_id
       WHERE ls.session_id = ?`,
      [sessionId]
    );
    if (sessions.length === 0) return res.status(404).json({ success: false, message: 'Live session not found' });

    const expectedDuration = sessions[0].expected_duration || 60;
    const thresholdPercent = sessions[0].attendance_threshold_percent !== undefined && sessions[0].attendance_threshold_percent !== null
      ? sessions[0].attendance_threshold_percent
      : 75;
    const duration = parseInt(duration_minutes || 0, 10);

    // Dynamic threshold check based on classroom settings
    const thresholdMinutes = Math.ceil(expectedDuration * (thresholdPercent / 100));
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

// PUT /api/live-sessions/:id/start - Instructor or TA starts live session manually
const startLiveSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.user_id;

    const [sessions] = await db.query(
      `SELECT ls.*, c.classroom_name
       FROM live_sessions ls
       JOIN classrooms c ON ls.classroom_id = c.classroom_id
       WHERE ls.session_id = ?`,
      [sessionId]
    );

    if (sessions.length === 0) return res.status(404).json({ success: false, message: 'Live session not found' });
    const session = sessions[0];

    if (!(await isInstructorOrTA(userId, session.classroom_id))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can start live sessions' });
    }

    await db.query(
      `UPDATE live_sessions
       SET started_at = NOW(), is_active = true, ended_at = NULL
       WHERE session_id = ?`,
      [sessionId]
    );

    // Notify all enrolled members that class is starting now
    const [members] = await db.query(
      `SELECT user_id FROM classroom_members WHERE classroom_id = ? AND is_active = true AND user_id != ?`,
      [session.classroom_id, userId]
    );

    for (const m of members) {
      await createNotification(
        m.user_id,
        'live_session',
        'Live Class Started',
        `Live class "${session.session_title}" is starting now in ${session.classroom_name}`,
        `/live.html?id=${sessionId}`
      );
    }

    res.json({ success: true, message: 'Live session started successfully' });
  } catch (error) {
    console.error('Error starting live session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/live-sessions/:id/end - Instructor or TA ends live session
const endLiveSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.user_id;

    const [sessions] = await db.query(
      `SELECT classroom_id FROM live_sessions WHERE session_id = ?`,
      [sessionId]
    );

    if (sessions.length === 0) return res.status(404).json({ success: false, message: 'Live session not found' });

    if (!(await isInstructorOrTA(userId, sessions[0].classroom_id))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can end live sessions' });
    }

    await db.query(
      `UPDATE live_sessions
       SET ended_at = NOW(), is_active = false
       WHERE session_id = ?`,
      [sessionId]
    );

    res.json({ success: true, message: 'Live session ended successfully' });
  } catch (error) {
    console.error('Error ending live session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/users/me/active-live-sessions - Fetch all active, un-ended live sessions for current user's enrolled classrooms
const getActiveLiveSessions = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const [activeSessions] = await db.query(
      `SELECT ls.session_id, ls.session_title, ls.jitsi_room_id, ls.started_at,
              c.classroom_id, c.classroom_name
       FROM live_sessions ls
       JOIN classrooms c ON ls.classroom_id = c.classroom_id
       JOIN classroom_members cm ON c.classroom_id = cm.classroom_id
       WHERE cm.user_id = ? AND cm.is_active = true
         AND ls.is_active = true AND ls.ended_at IS NULL AND ls.started_at IS NOT NULL
       ORDER BY ls.started_at DESC`,
      [userId]
    );

    res.json({ success: true, data: activeSessions });
  } catch (error) {
    console.error('Error fetching active live sessions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/live-sessions/:id/attendance/export - Download session attendance CSV
const exportAttendanceCSV = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.user_id;

    const [sessions] = await db.query(
      `SELECT ls.session_title, ls.classroom_id, c.classroom_name
       FROM live_sessions ls
       JOIN classrooms c ON ls.classroom_id = c.classroom_id
       WHERE ls.session_id = ?`,
      [sessionId]
    );

    if (sessions.length === 0) return res.status(404).json({ success: false, message: 'Live session not found' });
    const session = sessions[0];

    if (!(await isInstructorOrTA(userId, session.classroom_id))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can export attendance' });
    }

    const [attendance] = await db.query(
      `SELECT a.*, u.full_name AS learner_name, u.email AS learner_email
       FROM attendance a
       JOIN users u ON a.learner_id = u.user_id
       WHERE a.session_id = ?
       ORDER BY u.full_name ASC`,
      [sessionId]
    );

    let csvLines = [
      'Student Name,Email,Duration (Minutes),Present Status,Instructor Override,Override Reason'
    ];

    attendance.forEach(a => {
      const isPresent = (a.is_present || (a.instructor_override && a.override_present)) ? 'Present' : 'Absent';
      const override = a.instructor_override ? 'Yes' : 'No';
      const reason = `"${(a.override_reason || '').replace(/"/g, '""')}"`;
      const name = `"${(a.learner_name || '').replace(/"/g, '""')}"`;
      const email = `"${(a.learner_email || '').replace(/"/g, '""')}"`;

      csvLines.push(`${name},${email},${a.duration_minutes || 0},${isPresent},${override},${reason}`);
    });

    const filename = `${session.session_title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Attendance.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(csvLines.join('\n'), 'utf-8'));
  } catch (error) {
    console.error('Error exporting attendance CSV:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createLiveSession,
  updateLiveSession,
  deleteLiveSession,
  getClassroomLiveSessions,
  getLiveSessionById,
  recordAttendanceDuration,
  overrideAttendance,
  startLiveSession,
  endLiveSession,
  getActiveLiveSessions,
  exportAttendanceCSV
};

