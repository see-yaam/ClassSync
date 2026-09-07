const db = require('../config/db');

// Helper to check instructor or TA role
const isInstructorOrTA = async (userId, classroomId) => {
  const [rows] = await db.query(
    `SELECT role FROM classroom_members WHERE user_id = ? AND classroom_id = ? AND is_active = true`,
    [userId, classroomId]
  );
  if (rows.length === 0) return false;
  return rows[0].role === 'instructor' || rows[0].role === 'TA';
};

// POST /api/classrooms/:id/resources
const addResource = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const { resource_title, resource_url, resource_description } = req.body;
    const userId = req.user.user_id;

    if (!resource_title || !resource_url) {
      return res.status(400).json({ success: false, message: 'Resource title and URL are required' });
    }

    const isStaff = await isInstructorOrTA(userId, classroomId);
    const isApproved = isStaff ? true : false;
    const approvedBy = isStaff ? userId : null;
    const approvedAt = isStaff ? new Date() : null;

    const [result] = await db.query(
      `INSERT INTO resources (classroom_id, submitted_by, resource_title, resource_url, resource_description, is_approved, approved_by, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [classroomId, userId, resource_title, resource_url, resource_description || '', isApproved, approvedBy, approvedAt]
    );

    res.status(201).json({
      success: true,
      message: isStaff ? 'Resource shared and auto-approved' : 'Resource submitted for instructor approval',
      data: {
        resource_id: result.insertId,
        is_approved: isApproved
      }
    });
  } catch (error) {
    console.error('Error adding resource:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/resources
const getClassroomResources = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const userId = req.user.user_id;

    const isStaff = await isInstructorOrTA(userId, classroomId);

    let query = `
      SELECT r.*, u.full_name AS submitter_name, app.full_name AS approver_name
      FROM resources r
      JOIN users u ON r.submitted_by = u.user_id
      LEFT JOIN users app ON r.approved_by = app.user_id
      WHERE r.classroom_id = ?
    `;

    if (!isStaff) {
      query += ` AND (r.is_approved = true OR r.submitted_by = ${parseInt(userId)})`;
    }

    query += ` ORDER BY r.created_at DESC`;

    const [rows] = await db.query(query, [classroomId]);
    res.json({ success: true, data: rows, is_staff: isStaff });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/resources/:id/approve - Instructor/TA approve resource
const approveResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user.user_id;

    const [resRows] = await db.query(`SELECT classroom_id FROM resources WHERE resource_id = ?`, [resourceId]);
    if (resRows.length === 0) return res.status(404).json({ success: false, message: 'Resource not found' });

    if (!(await isInstructorOrTA(userId, resRows[0].classroom_id))) {
      return res.status(403).json({ success: false, message: 'Only instructors or TAs can approve resources' });
    }

    await db.query(
      `UPDATE resources SET is_approved = true, approved_by = ?, approved_at = NOW() WHERE resource_id = ?`,
      [userId, resourceId]
    );

    res.json({ success: true, message: 'Resource approved successfully' });
  } catch (error) {
    console.error('Error approving resource:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  addResource,
  getClassroomResources,
  approveResource
};
