const db = require('../config/db');
const crypto = require('crypto');

// Generate unique Room Number (e.g. CS-9824) and Random Password
const generateRoomCredentials = () => {
  const roomNumber = 'ROOM-' + Math.floor(100000 + Math.random() * 900000);
  const roomPassword = Math.random().toString(36).slice(-8);
  return { roomNumber, roomPassword };
};

// POST /api/classrooms - Create Classroom
const createClassroom = async (req, res) => {
  try {
    const { classroom_name, description, visibility, is_paid, price, cover_photo_url } = req.body;
    const creator_id = req.user.user_id;

    if (!classroom_name) {
      return res.status(400).json({ success: false, message: 'Classroom name is required' });
    }

    const { roomNumber, roomPassword } = generateRoomCredentials();
    const isPublic = visibility === 'public' ? 'public' : 'private';
    const isPaid = is_paid === true || is_paid === 'true' || is_paid === 1;
    const coursePrice = isPaid ? parseFloat(price) || 0 : null;

    const [result] = await db.query(
      `INSERT INTO classrooms (creator_id, room_number, room_password, classroom_name, description, visibility, is_paid, price, cover_photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [creator_id, roomNumber, roomPassword, classroom_name, description || '', isPublic, isPaid, coursePrice, cover_photo_url || null]
    );

    const classroom_id = result.insertId;

    // Add creator as instructor in classroom_members
    await db.query(
      `INSERT INTO classroom_members (user_id, classroom_id, role)
       VALUES (?, ?, 'instructor')`,
      [creator_id, classroom_id]
    );

    res.status(201).json({
      success: true,
      message: 'Classroom created successfully',
      data: {
        classroom_id,
        classroom_name,
        description,
        visibility: isPublic,
        is_paid: isPaid,
        price: coursePrice,
        cover_photo_url,
        room_number: roomNumber,
        room_password: roomPassword
      }
    });
  } catch (error) {
    console.error('Error creating classroom:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/classrooms/:id/settings - Update Classroom Settings (Instructor Only)
const updateClassroomSettings = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const { classroom_name, room_password, description, cover_photo_url, is_paid, price, visibility, attendance_threshold_percent } = req.body;

    if (!classroom_name) {
      return res.status(400).json({ success: false, message: 'Classroom name is required' });
    }

    const isPublic = visibility === 'public' ? 'public' : 'private';
    const isPaid = is_paid === true || is_paid === 'true' || is_paid === 1;
    const coursePrice = isPaid ? parseFloat(price) || 0 : null;
    const thresholdPercent = attendance_threshold_percent !== undefined && attendance_threshold_percent !== null && attendance_threshold_percent !== ''
      ? Math.min(100, Math.max(1, parseInt(attendance_threshold_percent, 10)))
      : 75;

    await db.query(
      `UPDATE classrooms
       SET classroom_name = ?, room_password = ?, description = ?, cover_photo_url = ?, visibility = ?, is_paid = ?, price = ?, attendance_threshold_percent = ?
       WHERE classroom_id = ? AND is_active = true`,
      [classroom_name, room_password, description || '', cover_photo_url || null, isPublic, isPaid, coursePrice, thresholdPercent, classroomId]
    );

    res.json({
      success: true,
      message: 'Classroom settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating classroom settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/courses/search - Public Course Search & Discovery (No Auth required for browsing)
const searchPublicCourses = async (req, res) => {
  try {
    const { q, type } = req.query;
    const activeUserId = req.user ? req.user.user_id : null;

    let query = `
      SELECT c.classroom_id, c.classroom_name, c.description, c.cover_photo_url,
             c.visibility, c.is_paid, c.price, c.created_at,
             u.full_name AS instructor_name, u.email AS instructor_email, u.profile_picture_url AS instructor_avatar,
             (SELECT COUNT(*) FROM classroom_members cm WHERE cm.classroom_id = c.classroom_id AND cm.is_active = true) AS member_count
      FROM classrooms c
      JOIN users u ON c.creator_id = u.user_id
      WHERE c.visibility = 'public' AND c.is_active = true
    `;
    const params = [];

    if (q && q.trim() !== '') {
      query += ` AND (c.classroom_name LIKE ? OR c.description LIKE ? OR u.full_name LIKE ?)`;
      const searchTerm = `%${q.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (type === 'free') {
      query += ` AND (c.is_paid = false OR c.is_paid IS NULL)`;
    } else if (type === 'paid') {
      query += ` AND c.is_paid = true`;
    }

    query += ` ORDER BY c.created_at DESC LIMIT 50`;

    const [rows] = await db.query(query, params);

    // If user is logged in, attach user enrollment status and active alerts for each course
    if (activeUserId && rows.length > 0) {
      const courseIds = rows.map(r => r.classroom_id);
      
      const [memberships] = await db.query(
        `SELECT classroom_id, role FROM classroom_members WHERE user_id = ? AND classroom_id IN (?) AND is_active = true`,
        [activeUserId, courseIds]
      );
      const memberMap = new Map(memberships.map(m => [m.classroom_id, m.role]));

      const [requests] = await db.query(
        `SELECT classroom_id, status FROM enrollment_requests WHERE user_id = ? AND classroom_id IN (?)`,
        [activeUserId, courseIds]
      );
      const requestMap = new Map(requests.map(r => [r.classroom_id, r.status]));

      const [alerts] = await db.query(
        `SELECT classroom_id, alert_type FROM learner_alerts 
         WHERE learner_id = ? AND classroom_id IN (?) AND (is_resolved = 0 OR is_resolved IS FALSE)
         ORDER BY created_at DESC`,
        [activeUserId, courseIds]
      );
      const alertMap = new Map();
      alerts.forEach(a => {
        if (!alertMap.has(a.classroom_id)) alertMap.set(a.classroom_id, a.alert_type);
      });

      rows.forEach(r => {
        if (memberMap.has(r.classroom_id)) {
          r.user_status = 'enrolled';
          r.user_role = memberMap.get(r.classroom_id);
        } else if (requestMap.has(r.classroom_id)) {
          r.user_status = requestMap.get(r.classroom_id); // 'pending' or 'rejected'
        } else {
          r.user_status = 'none';
        }
        r.active_alert_type = alertMap.get(r.classroom_id) || null;
      });
    } else {
      rows.forEach(r => {
        r.user_status = 'none';
        r.active_alert_type = null;
      });
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error searching public courses:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/classrooms/:id/enroll - Direct Join for Public Free Courses
const enrollPublicFree = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const user_id = req.user.user_id;

    const [rooms] = await db.query(
      `SELECT classroom_id, classroom_name, visibility, is_paid FROM classrooms WHERE classroom_id = ? AND is_active = true`,
      [classroomId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const course = rooms[0];

    if (course.visibility !== 'public') {
      return res.status(400).json({ success: false, message: 'This course is private and requires a room number and password to join.' });
    }

    if (course.is_paid) {
      return res.status(400).json({ success: false, message: 'This course is paid. Please submit an enrollment request with payment details.' });
    }

    // Check existing membership
    const [existing] = await db.query(
      `SELECT member_id, is_active FROM classroom_members WHERE user_id = ? AND classroom_id = ?`,
      [user_id, classroomId]
    );

    if (existing.length > 0) {
      if (!existing[0].is_active) {
        await db.query(`UPDATE classroom_members SET is_active = true WHERE member_id = ?`, [existing[0].member_id]);
        return res.json({ success: true, message: 'Enrolled in course successfully', data: { classroom_id: classroomId } });
      }
      return res.status(400).json({ success: false, message: 'You are already enrolled in this course' });
    }

    await db.query(
      `INSERT INTO classroom_members (user_id, classroom_id, role) VALUES (?, ?, 'learner')`,
      [user_id, classroomId]
    );

    res.json({
      success: true,
      message: `Successfully enrolled in "${course.classroom_name}"`,
      data: { classroom_id: classroomId }
    });
  } catch (error) {
    console.error('Error enrolling in public free course:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/classrooms/:id/enrollment-request - Submit Payment Request for Public Paid Course
const submitEnrollmentRequest = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const userId = req.user.user_id;
    const { payment_method, payer_phone_number, transaction_id } = req.body;

    if (!payment_method || !transaction_id) {
      return res.status(400).json({ success: false, message: 'Payment method and Transaction ID are required' });
    }

    const [rooms] = await db.query(
      `SELECT c.classroom_id, c.classroom_name, c.creator_id, c.visibility, c.is_paid, c.price
       FROM classrooms c WHERE c.classroom_id = ? AND c.is_active = true`,
      [classroomId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const course = rooms[0];

    // Check existing membership
    const [existingMem] = await db.query(
      `SELECT member_id FROM classroom_members WHERE user_id = ? AND classroom_id = ? AND is_active = true`,
      [userId, classroomId]
    );
    if (existingMem.length > 0) {
      return res.status(400).json({ success: false, message: 'You are already enrolled in this course' });
    }

    // Check existing request
    const [existingReq] = await db.query(
      `SELECT request_id, status FROM enrollment_requests WHERE user_id = ? AND classroom_id = ?`,
      [userId, classroomId]
    );

    if (existingReq.length > 0) {
      if (existingReq[0].status === 'pending') {
        return res.status(400).json({ success: false, message: 'You already have a pending enrollment request for this course.' });
      }
      // Re-submit if previously rejected or updated
      await db.query(
        `UPDATE enrollment_requests
         SET payment_method = ?, payer_phone_number = ?, transaction_id = ?, status = 'pending', requested_at = NOW(), reviewed_by = NULL, reviewed_at = NULL
         WHERE request_id = ?`,
        [payment_method, payer_phone_number || '', transaction_id, existingReq[0].request_id]
      );
    } else {
      await db.query(
        `INSERT INTO enrollment_requests (classroom_id, user_id, payment_method, payer_phone_number, transaction_id, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [classroomId, userId, payment_method, payer_phone_number || '', transaction_id]
      );
    }

    // Send notification to instructor
    const { createNotification } = require('../utils/notificationHelper');
    await createNotification(
      course.creator_id,
      'enrollment_request',
      'New Paid Course Enrollment Request',
      `Student ${req.user.full_name} submitted a payment request (${payment_method} - Trx: ${transaction_id}) for "${course.classroom_name}".`,
      `/classroom.html?id=${classroomId}&tab=requests`
    );

    res.status(201).json({
      success: true,
      message: 'Enrollment payment request submitted successfully. Waiting for instructor approval.'
    });
  } catch (error) {
    console.error('Error submitting enrollment request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/enrollment-requests - List Requests (Instructor Only)
const getEnrollmentRequests = async (req, res) => {
  try {
    const classroomId = req.params.id;

    const [rows] = await db.query(
      `SELECT er.request_id, er.classroom_id, er.user_id, er.payment_method,
              er.payer_phone_number, er.transaction_id, er.status, er.requested_at,
              er.reviewed_at, u.full_name AS student_name, u.email AS student_email,
              u.profile_picture_url AS student_avatar, r.full_name AS reviewer_name
       FROM enrollment_requests er
       JOIN users u ON er.user_id = u.user_id
       LEFT JOIN users r ON er.reviewed_by = r.user_id
       WHERE er.classroom_id = ?
       ORDER BY CASE er.status WHEN 'pending' THEN 1 ELSE 2 END, er.requested_at DESC`,
      [classroomId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching enrollment requests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/enrollment-requests/:id/approve - Approve Enrollment Request (Instructor Only)
const approveEnrollmentRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const reviewerId = req.user.user_id;

    const [requests] = await db.query(
      `SELECT er.request_id, er.classroom_id, er.user_id, er.status, c.classroom_name
       FROM enrollment_requests er
       JOIN classrooms c ON er.classroom_id = c.classroom_id
       WHERE er.request_id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment request not found' });
    }

    const reqItem = requests[0];

    // Update request status
    await db.query(
      `UPDATE enrollment_requests SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() WHERE request_id = ?`,
      [reviewerId, requestId]
    );

    // Add student to classroom_members
    const [existingMem] = await db.query(
      `SELECT member_id FROM classroom_members WHERE user_id = ? AND classroom_id = ?`,
      [reqItem.user_id, reqItem.classroom_id]
    );

    if (existingMem.length > 0) {
      await db.query(`UPDATE classroom_members SET is_active = true, role = 'learner' WHERE member_id = ?`, [existingMem[0].member_id]);
    } else {
      await db.query(
        `INSERT INTO classroom_members (user_id, classroom_id, role) VALUES (?, ?, 'learner')`,
        [reqItem.user_id, reqItem.classroom_id]
      );
    }

    // Notify student
    const { createNotification } = require('../utils/notificationHelper');
    await createNotification(
      reqItem.user_id,
      'enrollment_approved',
      'Course Enrollment Approved!',
      `Your paid enrollment request for "${reqItem.classroom_name}" has been approved! You now have full access to the classroom.`,
      `/classroom.html?id=${reqItem.classroom_id}`
    );

    res.json({ success: true, message: 'Enrollment request approved successfully' });
  } catch (error) {
    console.error('Error approving enrollment request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/enrollment-requests/:id/reject - Reject Enrollment Request (Instructor Only)
const rejectEnrollmentRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const reviewerId = req.user.user_id;

    const [requests] = await db.query(
      `SELECT er.request_id, er.classroom_id, er.user_id, c.classroom_name
       FROM enrollment_requests er
       JOIN classrooms c ON er.classroom_id = c.classroom_id
       WHERE er.request_id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment request not found' });
    }

    const reqItem = requests[0];

    await db.query(
      `UPDATE enrollment_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW() WHERE request_id = ?`,
      [reviewerId, requestId]
    );

    // Notify student
    const { createNotification } = require('../utils/notificationHelper');
    await createNotification(
      reqItem.user_id,
      'enrollment_rejected',
      'Enrollment Request Declined',
      `Your enrollment request for "${reqItem.classroom_name}" was declined. Please verify your transaction ID or contact the instructor.`,
      `/#browse`
    );

    res.json({ success: true, message: 'Enrollment request rejected' });
  } catch (error) {
    console.error('Error rejecting enrollment request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/classrooms/join - Join Classroom via Room Number + Password
const joinClassroom = async (req, res) => {
  try {
    const { room_number, room_password } = req.body;
    const user_id = req.user.user_id;

    if (!room_number || !room_password) {
      return res.status(400).json({ success: false, message: 'Room number and password are required' });
    }

    // Find classroom
    const [rooms] = await db.query(
      `SELECT classroom_id, classroom_name, room_password, is_paid, price FROM classrooms WHERE room_number = ? AND is_active = true`,
      [room_number]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Classroom not found with this Room Number' });
    }

    const classroom = rooms[0];

    if (classroom.room_password !== room_password) {
      return res.status(401).json({ success: false, message: 'Invalid room password' });
    }

    // Check existing membership
    const [existing] = await db.query(
      `SELECT member_id, role, is_active FROM classroom_members WHERE user_id = ? AND classroom_id = ?`,
      [user_id, classroom.classroom_id]
    );

    if (existing.length > 0) {
      if (!existing[0].is_active) {
        await db.query(
          `UPDATE classroom_members SET is_active = true WHERE member_id = ?`,
          [existing[0].member_id]
        );
        return res.json({ success: true, requires_payment: false, message: 'Re-joined classroom successfully', data: { classroom_id: classroom.classroom_id } });
      }
      return res.status(400).json({ success: false, message: 'You are already a member of this classroom' });
    }

    // Check if user already submitted a pending payment request for this course
    const [existingReq] = await db.query(
      `SELECT request_id, status FROM enrollment_requests WHERE user_id = ? AND classroom_id = ?`,
      [user_id, classroom.classroom_id]
    );
    if (existingReq.length > 0 && existingReq[0].status === 'pending') {
      return res.status(400).json({ success: false, message: 'You already have a pending enrollment request for this course. Please wait for instructor approval.' });
    }

    // If private paid course, flag that payment is required
    if (classroom.is_paid) {
      return res.json({
        success: true,
        requires_payment: true,
        message: `Room and password verified! "${classroom.classroom_name}" is a paid course (${classroom.price ? 'Tk. ' + classroom.price : 'Paid'}). Please submit your payment details to complete enrollment.`,
        data: {
          classroom_id: classroom.classroom_id,
          classroom_name: classroom.classroom_name,
          is_paid: true,
          price: classroom.price
        }
      });
    }

    // Free Private Course -> Directly add member as learner
    await db.query(
      `INSERT INTO classroom_members (user_id, classroom_id, role) VALUES (?, ?, 'learner')`,
      [user_id, classroom.classroom_id]
    );

    res.json({
      success: true,
      requires_payment: false,
      message: `Joined classroom "${classroom.classroom_name}" successfully`,
      data: { classroom_id: classroom.classroom_id }
    });
  } catch (error) {
    console.error('Error joining classroom:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms - List all classrooms for current user
const getUserClassrooms = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const [rows] = await db.query(
      `SELECT c.classroom_id, c.classroom_name, c.description, c.room_number, c.room_password,
              c.visibility, c.is_paid, c.price, c.cover_photo_url,
              c.creator_id, u.full_name AS creator_name, cm.role, cm.joined_at,
              (SELECT la.alert_type FROM learner_alerts la WHERE la.classroom_id = c.classroom_id AND la.learner_id = ? AND la.is_resolved = false ORDER BY la.created_at DESC LIMIT 1) AS active_alert_type
       FROM classroom_members cm
       JOIN classrooms c ON cm.classroom_id = c.classroom_id
       JOIN users u ON c.creator_id = u.user_id
       WHERE cm.user_id = ? AND cm.is_active = true AND c.is_active = true
       ORDER BY cm.joined_at DESC`,
      [user_id, user_id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching user classrooms:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id - Get classroom details and member list
const getClassroomById = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const user_id = req.user.user_id;

    // Get classroom info
    const [rooms] = await db.query(
      `SELECT c.classroom_id, c.classroom_name, c.description, c.room_number, c.room_password,
              c.visibility, c.is_paid, c.price, c.cover_photo_url, c.attendance_threshold_percent,
              c.creator_id, u.full_name AS creator_name, u.email AS creator_email, c.created_at
       FROM classrooms c
       JOIN users u ON c.creator_id = u.user_id
       WHERE c.classroom_id = ? AND c.is_active = true`,
      [classroomId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    // Check user membership role
    const [memberInfo] = await db.query(
      `SELECT role FROM classroom_members WHERE user_id = ? AND classroom_id = ? AND is_active = true`,
      [user_id, classroomId]
    );

    if (memberInfo.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this classroom' });
    }

    const currentRole = memberInfo[0].role;

    // Fetch active unresolved alert for current user
    const [userAlertRows] = await db.query(
      `SELECT alert_id, alert_type, alert_message, created_at
       FROM learner_alerts
       WHERE classroom_id = ? AND learner_id = ? AND (is_resolved = 0 OR is_resolved IS FALSE)
       ORDER BY created_at DESC LIMIT 1`,
      [classroomId, user_id]
    );
    const active_alert = userAlertRows.length > 0 ? userAlertRows[0] : null;

    // Get all members
    const [members] = await db.query(
      `SELECT cm.member_id, cm.user_id, u.full_name, u.email, u.profile_picture_url, cm.role, cm.joined_at
       FROM classroom_members cm
       JOIN users u ON cm.user_id = u.user_id
       WHERE cm.classroom_id = ? AND cm.is_active = true
       ORDER BY CASE cm.role WHEN 'instructor' THEN 1 WHEN 'TA' THEN 2 ELSE 3 END, u.full_name ASC`,
      [classroomId]
    );

    res.json({
      success: true,
      data: {
        ...rooms[0],
        user_role: currentRole,
        active_alert,
        members
      }
    });
  } catch (error) {
    console.error('Error fetching classroom details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/classrooms/:id/members/:memberId/role - Promote/demote role (TA role grant)
const updateMemberRole = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const memberId = req.params.memberId;
    const { role } = req.body; // 'TA' or 'learner'
    const activeUserId = req.user.user_id;

    if (!['TA', 'learner'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be TA or learner.' });
    }

    // Check if active user is instructor of this classroom
    const [instructorCheck] = await db.query(
      `SELECT role FROM classroom_members WHERE user_id = ? AND classroom_id = ? AND role = 'instructor'`,
      [activeUserId, classroomId]
    );

    if (instructorCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Only instructors can assign TA roles' });
    }

    await db.query(
      `UPDATE classroom_members SET role = ? WHERE member_id = ? AND classroom_id = ?`,
      [role, memberId, classroomId]
    );

    res.json({ success: true, message: `Member role updated to ${role}` });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/student-info - Get Enrolled Student Roster & Attendance Stats (Instructor/TA only)
const getStudentInfo = async (req, res) => {
  try {
    const classroomId = req.params.id;

    // 1. Get total live sessions for this classroom
    const [[{ total_sessions }]] = await db.query(
      `SELECT COUNT(*) as total_sessions FROM live_sessions WHERE classroom_id = ? AND is_active = true`,
      [classroomId]
    );

    // 2. Fetch all learners enrolled in this classroom with their user info
    const [learners] = await db.query(
      `SELECT 
         cm.member_id, cm.user_id, cm.role, cm.joined_at,
         u.full_name, u.email, u.phone_number
       FROM classroom_members cm
       JOIN users u ON cm.user_id = u.user_id
       WHERE cm.classroom_id = ? AND cm.role = 'learner' AND cm.is_active = true
       ORDER BY u.full_name ASC`,
      [classroomId]
    );

    // 3. For each learner, calculate present sessions and attendance percentage
    const total = parseInt(total_sessions, 10) || 0;

    const studentInfo = await Promise.all(
      learners.map(async (learner) => {
        const [[{ present_sessions }]] = await db.query(
          `SELECT COUNT(DISTINCT a.session_id) as present_sessions
           FROM attendance a
           JOIN live_sessions ls ON a.session_id = ls.session_id
           WHERE ls.classroom_id = ? AND ls.is_active = true AND a.learner_id = ?
             AND (a.is_present = true OR (a.instructor_override = true AND a.override_present = true))`,
          [classroomId, learner.user_id]
        );

        const present = parseInt(present_sessions, 10) || 0;

        let attendance_percentage = null;
        if (total > 0) {
          attendance_percentage = Math.round((present / total) * 1000) / 10; // 1 decimal place
        }

        const [alertRows] = await db.query(
          `SELECT alert_id, alert_type, alert_message, created_at
           FROM learner_alerts
           WHERE classroom_id = ? AND learner_id = ? AND (is_resolved = 0 OR is_resolved IS FALSE)
           ORDER BY created_at DESC LIMIT 1`,
          [classroomId, learner.user_id]
        );
        const active_alert = alertRows.length > 0 ? alertRows[0] : null;

        return {
          member_id: learner.member_id,
          user_id: learner.user_id,
          full_name: learner.full_name,
          email: learner.email,
          phone_number: learner.phone_number || null,
          role: learner.role,
          joined_at: learner.joined_at,
          total_sessions: total,
          present_sessions: present,
          attendance_percentage,
          active_alert
        };
      })
    );

    res.json({
      success: true,
      data: {
        classroom_id: parseInt(classroomId, 10),
        total_sessions: total,
        students: studentInfo
      }
    });
  } catch (error) {
    console.error('Error fetching student info:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/classrooms/:id/leave - Learner leaves classroom
const leaveClassroom = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const userId = req.user.user_id;

    // Check member status
    const [members] = await db.query(
      `SELECT member_id, role FROM classroom_members WHERE classroom_id = ? AND user_id = ? AND is_active = true`,
      [classroomId, userId]
    );

    if (members.length === 0) {
      return res.status(404).json({ success: false, message: 'You are not an active member of this classroom' });
    }

    const memberRole = members[0].role;
    if (memberRole === 'instructor') {
      return res.status(400).json({ success: false, message: 'Instructors cannot leave classrooms they created' });
    }

    // Delete membership row for learner
    await db.query(
      `DELETE FROM classroom_members WHERE classroom_id = ? AND user_id = ?`,
      [classroomId, userId]
    );

    res.json({
      success: true,
      message: 'You have left the classroom successfully'
    });
  } catch (error) {
    console.error('Error leaving classroom:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/classrooms/:id - Delete Classroom (Instructor Only)
const deleteClassroom = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const { confirmation_word } = req.body;

    if (!confirmation_word || confirmation_word.trim().toUpperCase() !== 'DELETE') {
      return res.status(400).json({ success: false, message: 'Security check failed: You must type DELETE to confirm deletion.' });
    }

    // Verify classroom exists
    const [rooms] = await db.query(
      `SELECT classroom_id, classroom_name FROM classrooms WHERE classroom_id = ? AND is_active = true`,
      [classroomId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    const course = rooms[0];

    // Deactivate classroom
    await db.query(`UPDATE classrooms SET is_active = false WHERE classroom_id = ?`, [classroomId]);

    // Deactivate member rows
    await db.query(`UPDATE classroom_members SET is_active = false WHERE classroom_id = ?`, [classroomId]);

    res.json({
      success: true,
      message: `Classroom "${course.classroom_name}" has been permanently deleted.`
    });
  } catch (error) {
    console.error('Error deleting classroom:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/gradebook/export - Export Gradebook as CSV (Instructor/TA only)
const exportGradebookCSV = async (req, res) => {
  try {
    const classroomId = req.params.id;

    // Get classroom name
    const [rooms] = await db.query(
      `SELECT classroom_name FROM classrooms WHERE classroom_id = ? AND is_active = true`,
      [classroomId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    const classroomName = rooms[0].classroom_name.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Fetch all learners in this classroom
    const [learners] = await db.query(
      `SELECT cm.user_id, u.full_name, u.email, cm.joined_at
       FROM classroom_members cm
       JOIN users u ON cm.user_id = u.user_id
       WHERE cm.classroom_id = ? AND cm.role = 'learner' AND cm.is_active = true
       ORDER BY u.full_name ASC`,
      [classroomId]
    );

    let csvLines = [
      'Student Name,Email,Joined Date,Total Submissions,Average Grade (%),Status'
    ];

    for (const l of learners) {
      const [subStats] = await db.query(
        `SELECT COUNT(DISTINCT s.submission_id) AS total_submissions,
                AVG(CASE WHEN g.score IS NOT NULL AND q.points > 0 THEN (g.score / q.points) * 100 ELSE NULL END) AS avg_score_pct
         FROM submissions s
         JOIN questions q ON s.question_id = q.question_id
         JOIN homework h ON q.homework_id = h.homework_id
         LEFT JOIN grades g ON s.submission_id = g.submission_id
         WHERE h.classroom_id = ? AND s.learner_id = ?`,
        [classroomId, l.user_id]
      );

      const totSub = subStats[0]?.total_submissions || 0;
      const avgScore = subStats[0]?.avg_score_pct !== null && subStats[0]?.avg_score_pct !== undefined
        ? `${Math.round(subStats[0].avg_score_pct * 10) / 10}%`
        : 'N/A';

      const status = subStats[0]?.avg_score_pct >= 70 ? 'Good Standing' : (subStats[0]?.avg_score_pct < 50 ? 'Needs Attention' : 'Satisfactory');

      const dateStr = l.joined_at ? new Date(l.joined_at).toISOString().split('T')[0] : 'N/A';
      const safeName = `"${(l.full_name || '').replace(/"/g, '""')}"`;
      const safeEmail = `"${(l.email || '').replace(/"/g, '""')}"`;

      csvLines.push(`${safeName},${safeEmail},${dateStr},${totSub},${avgScore},${status}`);
    }

    const csvContent = csvLines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${classroomName}_Gradebook.csv"`);
    res.send(Buffer.from(csvContent, 'utf-8'));
  } catch (error) {
    console.error('Error exporting gradebook CSV:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createClassroom,
  updateClassroomSettings,
  searchPublicCourses,
  enrollPublicFree,
  submitEnrollmentRequest,
  getEnrollmentRequests,
  approveEnrollmentRequest,
  rejectEnrollmentRequest,
  joinClassroom,
  getUserClassrooms,
  getClassroomById,
  updateMemberRole,
  getStudentInfo,
  leaveClassroom,
  deleteClassroom,
  exportGradebookCSV
};

