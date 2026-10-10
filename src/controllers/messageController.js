const db = require('../config/db');

// Helper to get user's role in a classroom
const getUserClassroomMember = async (userId, classroomId) => {
  const [rows] = await db.query(
    `SELECT role, is_active FROM classroom_members WHERE user_id = ? AND classroom_id = ? AND is_active = true`,
    [userId, classroomId]
  );
  return rows.length > 0 ? rows[0] : null;
};

// GET /api/classrooms/:id/messages - Fetch last 100 group chat messages
const getClassroomMessages = async (req, res) => {
  try {
    const classroomId = req.params.id;

    const [rows] = await db.query(
      `SELECT m.message_id, m.classroom_id, m.sender_id, m.message_text, m.sent_at,
              u.full_name AS sender_name, cm.role AS sender_role
       FROM classroom_messages m
       JOIN users u ON m.sender_id = u.user_id
       LEFT JOIN classroom_members cm ON m.sender_id = cm.user_id AND cm.classroom_id = m.classroom_id
       WHERE m.classroom_id = ?
       ORDER BY m.sent_at DESC
       LIMIT 100`,
      [classroomId]
    );

    // Return in chronological order (oldest to newest)
    const messages = rows.reverse();

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/classrooms/:id/messages - Post group chat message
const postClassroomMessage = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const { message_text } = req.body;
    const senderId = req.user.user_id;

    if (!message_text || !message_text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const [result] = await db.query(
      `INSERT INTO classroom_messages (classroom_id, sender_id, message_text)
       VALUES (?, ?, ?)`,
      [classroomId, senderId, message_text.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Message sent',
      data: {
        message_id: result.insertId,
        classroom_id: parseInt(classroomId, 10),
        sender_id: senderId,
        message_text: message_text.trim(),
        sent_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error posting group message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/dm-contacts - Fetch eligible DM contact list
const getDmContacts = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const userId = req.user.user_id;

    const currentMember = await getUserClassroomMember(userId, classroomId);
    if (!currentMember) {
      return res.status(403).json({ success: false, message: 'Access denied to this classroom' });
    }

    let contactsQuery = '';
    let params = [];

    if (currentMember.role === 'learner') {
      // Learners can DM Instructors and TAs of this classroom
      contactsQuery = `
        SELECT u.user_id, u.full_name, u.email, cm.role,
               (SELECT COUNT(*) FROM direct_messages dm WHERE dm.classroom_id = cm.classroom_id AND dm.sender_id = u.user_id AND dm.recipient_id = ? AND dm.is_read = false) AS unread_count
        FROM classroom_members cm
        JOIN users u ON cm.user_id = u.user_id
        WHERE cm.classroom_id = ? AND cm.role IN ('instructor', 'TA') AND cm.is_active = true AND cm.user_id != ?
        ORDER BY cm.role ASC, u.full_name ASC`;
      params = [userId, classroomId, userId];
    } else {
      // Instructors & TAs can DM any member (learners & staff) in this classroom
      contactsQuery = `
        SELECT u.user_id, u.full_name, u.email, cm.role,
               (SELECT COUNT(*) FROM direct_messages dm WHERE dm.classroom_id = cm.classroom_id AND dm.sender_id = u.user_id AND dm.recipient_id = ? AND dm.is_read = false) AS unread_count
        FROM classroom_members cm
        JOIN users u ON cm.user_id = u.user_id
        WHERE cm.classroom_id = ? AND cm.is_active = true AND cm.user_id != ?
        ORDER BY FIELD(cm.role, 'instructor', 'TA', 'learner'), u.full_name ASC`;
      params = [userId, classroomId, userId];
    }

    const [contacts] = await db.query(contactsQuery, params);
    res.json({ success: true, data: contacts });
  } catch (error) {
    console.error('Error fetching DM contacts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/dm/:otherUserId - Fetch last 50 DMs with otherUserId
const getDirectMessages = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const otherUserId = req.params.otherUserId;
    const currentUserId = req.user.user_id;

    // Strict validation: recipient must be an active member of THIS classroom
    const otherMember = await getUserClassroomMember(otherUserId, classroomId);
    if (!otherMember) {
      return res.status(404).json({ success: false, message: 'Recipient is not an active member of this classroom' });
    }

    // Fetch last 50 DM messages
    const [rows] = await db.query(
      `SELECT dm.message_id, dm.classroom_id, dm.sender_id, dm.recipient_id, dm.message_text, dm.sent_at, dm.is_read,
              u.full_name AS sender_name
       FROM direct_messages dm
       JOIN users u ON dm.sender_id = u.user_id
       WHERE dm.classroom_id = ? 
         AND ((dm.sender_id = ? AND dm.recipient_id = ?) OR (dm.sender_id = ? AND dm.recipient_id = ?))
       ORDER BY dm.sent_at DESC
       LIMIT 50`,
      [classroomId, currentUserId, otherUserId, otherUserId, currentUserId]
    );

    // Mark received messages as read
    await db.query(
      `UPDATE direct_messages
       SET is_read = true
       WHERE classroom_id = ? AND recipient_id = ? AND sender_id = ? AND is_read = false`,
      [classroomId, currentUserId, otherUserId]
    );

    const messages = rows.reverse();

    res.json({
      success: true,
      data: {
        other_user_id: parseInt(otherUserId, 10),
        messages
      }
    });
  } catch (error) {
    console.error('Error fetching DMs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/classrooms/:id/dm/:otherUserId - Send DM
const postDirectMessage = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const recipientId = req.params.otherUserId;
    const senderId = req.user.user_id;
    const { message_text } = req.body;

    if (!message_text || !message_text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    // Strict classroom-scoped validation
    const senderMember = await getUserClassroomMember(senderId, classroomId);
    const recipientMember = await getUserClassroomMember(recipientId, classroomId);

    if (!senderMember || !recipientMember) {
      return res.status(403).json({ success: false, message: 'Both users must be active members of this classroom' });
    }

    if (senderMember.role === 'learner' && !['instructor', 'TA'].includes(recipientMember.role)) {
      return res.status(403).json({ success: false, message: 'Learners can only send direct messages to Instructors or TAs of this classroom' });
    }

    const [result] = await db.query(
      `INSERT INTO direct_messages (classroom_id, sender_id, recipient_id, message_text)
       VALUES (?, ?, ?, ?)`,
      [classroomId, senderId, recipientId, message_text.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Direct message sent',
      data: {
        message_id: result.insertId,
        classroom_id: parseInt(classroomId, 10),
        sender_id: senderId,
        recipient_id: parseInt(recipientId, 10),
        message_text: message_text.trim(),
        sent_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error sending DM:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/dm/unread-count - Get total unread DMs in this classroom for current user
const getUnreadDmCount = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const userId = req.user.user_id;

    const [[{ unread_count }]] = await db.query(
      `SELECT COUNT(*) AS unread_count
       FROM direct_messages
       WHERE classroom_id = ? AND recipient_id = ? AND is_read = false`,
      [classroomId, userId]
    );

    const [[latestMsg]] = await db.query(
      `SELECT MAX(message_id) AS latest_group_msg_id
       FROM classroom_messages
       WHERE classroom_id = ?`,
      [classroomId]
    );

    res.json({
      success: true,
      data: {
        unread_count: parseInt(unread_count, 10) || 0,
        latest_group_msg_id: latestMsg?.latest_group_msg_id || 0
      }
    });
  } catch (error) {
    console.error('Error fetching unread DM count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getClassroomMessages,
  postClassroomMessage,
  getDmContacts,
  getDirectMessages,
  postDirectMessage,
  getUnreadDmCount
};
