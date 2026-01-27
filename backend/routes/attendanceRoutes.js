const express = require('express');
const router = express.Router();
const {
    createAttendance,
    getAttendance,
    getEventAttendance,
    getCourseAttendance,
    getStudentAttendanceSummary,
    updateAttendance,
    deleteAttendance,
    bulkCreateAttendance
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all attendance routes - only instructor and admin can access
router.use(protect, authorize('instructor', 'admin', 'sub-admin'));

// Create attendance record
router.post('/', createAttendance);

// Bulk create attendance records
router.post('/bulk', bulkCreateAttendance);

// Get all attendance records with filters
router.get('/', getAttendance);

// Get attendance for specific event
router.get('/event/:eventId', getEventAttendance);

// Get attendance for specific course
router.get('/course/:courseId', getCourseAttendance);

// Get student attendance summary
router.get('/student/:studentId/summary', getStudentAttendanceSummary);

// Update attendance record
router.put('/:id', updateAttendance);

// Delete attendance record (admin only)
router.delete('/:id', protect, authorize('admin', 'sub-admin'), deleteAttendance);

module.exports = router;
