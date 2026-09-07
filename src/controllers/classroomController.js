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
    const { classroom_name, description } = req.body;
    const creator_id = req.user.user_id;

    if (!classroom_name) {
      return res.status(400).json({ success: false, message: 'Classroom name is required' });
    }

    const { roomNumber, roomPassword } = generateRoomCredentials();

    const [result] = await db.query(
      `INSERT INTO classrooms (creator_id, room_number, room_password, classroom_name, description)
       VALUES (?, ?, ?, ?, ?)`,
      [creator_id, roomNumber, roomPassword, classroom_name, description || '']
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
        room_number: roomNumber,
        room_password: roomPassword
      }
    });
  } catch (error) {
    console.error('Error creating classroom:', error);
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
      `SELECT classroom_id, classroom_name, room_password FROM classrooms WHERE room_number = ? AND is_active = true`,
      [room_number]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
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
        return res.json({ success: true, message: 'Re-joined classroom successfully', data: { classroom_id: classroom.classroom_id } });
      }
      return res.status(400).json({ success: false, message: 'You are already a member of this classroom' });
    }

    // Add member as learner
    await db.query(
      `INSERT INTO classroom_members (user_id, classroom_id, role) VALUES (?, ?, 'learner')`,
      [user_id, classroom.classroom_id]
    );

    res.json({
      success: true,
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
              c.creator_id, u.full_name AS creator_name, cm.role, cm.joined_at
       FROM classroom_members cm
       JOIN classrooms c ON cm.classroom_id = c.classroom_id
       JOIN users u ON c.creator_id = u.user_id
       WHERE cm.user_id = ? AND cm.is_active = true AND c.is_active = true
       ORDER BY cm.joined_at DESC`,
      [user_id]
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

module.exports = {
  createClassroom,
  joinClassroom,
  getUserClassrooms,
  getClassroomById,
  updateMemberRole
};
