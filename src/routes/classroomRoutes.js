const express = require('express');
const router = express.Router();
const {
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
  deleteClassroom
} = require('../controllers/classroomController');
const { verifyToken, optionalToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');
const { getClassroomSubmissionMatrix } = require('../controllers/submissionController');

// Public course search & discovery (Optional authentication)
router.get('/courses/search', optionalToken, searchPublicCourses);
router.get('/classrooms/public/search', optionalToken, searchPublicCourses);

// Classroom management
router.post('/classrooms', verifyToken, createClassroom);
router.post('/classrooms/join', verifyToken, joinClassroom);
router.get('/classrooms', verifyToken, getUserClassrooms);
router.get('/classrooms/:id', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getClassroomById);
router.delete('/classrooms/:id/leave', verifyToken, requireClassroomRole(['learner'], 'classroom'), leaveClassroom);
router.delete('/classrooms/:id', verifyToken, requireClassroomRole(['instructor'], 'classroom'), deleteClassroom);

// Student Info & Attendance Roster & Submissions
router.get('/classrooms/:id/student-info', verifyToken, requireClassroomRole(['instructor', 'TA'], 'classroom'), getStudentInfo);
router.get('/classrooms/:id/matrix', verifyToken, requireClassroomRole(['instructor', 'TA'], 'classroom'), getClassroomSubmissionMatrix);


// Settings update (Instructor Only)
router.put('/classrooms/:id/settings', verifyToken, requireClassroomRole(['instructor'], 'classroom'), updateClassroomSettings);


// Public enrollments & payment requests
router.post('/classrooms/:id/enroll', verifyToken, enrollPublicFree);
router.post('/classrooms/:id/enrollment-request', verifyToken, submitEnrollmentRequest);

// Instructor enrollment requests management
router.get('/classrooms/:id/enrollment-requests', verifyToken, requireClassroomRole(['instructor'], 'classroom'), getEnrollmentRequests);
router.put('/enrollment-requests/:id/approve', verifyToken, requireClassroomRole(['instructor'], 'enrollment-request'), approveEnrollmentRequest);
router.put('/enrollment-requests/:id/reject', verifyToken, requireClassroomRole(['instructor'], 'enrollment-request'), rejectEnrollmentRequest);

// Role assignments
router.post('/classrooms/:id/members/:memberId/role', verifyToken, requireClassroomRole(['instructor'], 'classroom'), updateMemberRole);

module.exports = router;

