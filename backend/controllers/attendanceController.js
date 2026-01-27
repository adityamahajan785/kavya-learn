const Attendance = require('../models/attendanceModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');
const Course = require('../models/courseModel');
const asyncHandler = require('express-async-handler');

// @desc    Create or update attendance record
// @route   POST /api/attendance
// @access  Private (Instructor/Admin)
const createAttendance = asyncHandler(async (req, res) => {
    const { eventId, studentId, status, courseId, remarks, duration, checkInTime, checkOutTime } = req.body;
    const instructorId = req.user._id;

    // Validate required fields
    if (!eventId || !studentId) {
        return res.status(400).json({ message: 'Event ID and Student ID are required' });
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student) {
        return res.status(404).json({ message: 'Student not found' });
    }

    // Check if instructor owns this event or is admin
    if (event.instructor.toString() !== instructorId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to record attendance for this event' });
    }

    // Check if attendance already exists for this event and student
    let attendance = await Attendance.findOne({ eventId, studentId });

    if (attendance) {
        // Update existing record
        attendance.status = status || attendance.status;
        attendance.remarks = remarks !== undefined ? remarks : attendance.remarks;
        attendance.duration = duration !== undefined ? duration : attendance.duration;
        if (checkInTime) attendance.checkInTime = checkInTime;
        if (checkOutTime) attendance.checkOutTime = checkOutTime;
        attendance.recordedType = 'manual';
        await attendance.save();
    } else {
        // Create new record
        attendance = await Attendance.create({
            eventId,
            studentId,
            instructorId,
            courseId: courseId || event.course,
            status: status || 'attended',
            meetingDate: event.date,
            remarks,
            duration,
            checkInTime,
            checkOutTime,
            recordedType: 'manual'
        });
    }

    // Populate references
    await attendance.populate('studentId', 'fullName email avatar');
    await attendance.populate('eventId', 'title date startTime endTime');
    await attendance.populate('courseId', 'title code');

    res.status(201).json({
        success: true,
        message: 'Attendance recorded successfully',
        data: attendance
    });
});

// @desc    Get attendance records (filtered)
// @route   GET /api/attendance
// @access  Private (Instructor/Admin)
const getAttendance = asyncHandler(async (req, res) => {
    const { eventId, courseId, startDate, endDate, status, instructorId: queryInstructorId } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Build filter
    const filter = {};

    // Instructors can only see their own attendance records
    if (userRole === 'instructor') {
        filter.instructorId = userId;
    } else if (queryInstructorId && (userRole === 'admin' || userRole === 'sub-admin')) {
        // Admin can filter by instructor
        filter.instructorId = queryInstructorId;
    }

    if (eventId) filter.eventId = eventId;
    if (courseId) filter.courseId = courseId;
    if (status) filter.status = status;

    // Date range filter
    if (startDate || endDate) {
        filter.meetingDate = {};
        if (startDate) filter.meetingDate.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.meetingDate.$lte = end;
        }
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
        Attendance.find(filter)
            .populate('studentId', 'fullName email avatar')
            .populate('eventId', 'title date startTime endTime')
            .populate('courseId', 'title code')
            .populate('instructorId', 'fullName email')
            .sort({ meetingDate: -1 })
            .limit(limit)
            .skip(skip),
        Attendance.countDocuments(filter)
    ]);

    res.status(200).json({
        success: true,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: records
    });
});

// @desc    Get attendance for a specific event
// @route   GET /api/attendance/event/:eventId
// @access  Private (Instructor/Admin)
const getEventAttendance = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Check event exists
    const event = await Event.findById(eventId).populate('instructor');
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    // Check authorization
    if (userRole === 'instructor' && event.instructor._id.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this event attendance' });
    }

    const records = await Attendance.find({ eventId })
        .populate('studentId', 'fullName email avatar')
        .populate('courseId', 'title code')
        .sort({ 'studentId.fullName': 1 });

    // Calculate summary stats
    const total = records.length;
    const attended = records.filter(r => r.status === 'attended').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;

    res.status(200).json({
        success: true,
        event: {
            _id: event._id,
            title: event.title,
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime
        },
        summary: {
            total,
            attended,
            absent,
            late,
            excused,
            attendancePercentage: total > 0 ? Math.round((attended / total) * 100) : 0
        },
        records
    });
});

// @desc    Get attendance for a specific course
// @route   GET /api/attendance/course/:courseId
// @access  Private (Instructor/Admin)
const getCourseAttendance = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Check course exists
    const course = await Course.findById(courseId);
    if (!course) {
        return res.status(404).json({ message: 'Course not found' });
    }

    // Build filter
    const filter = { courseId };

    if (userRole === 'instructor') {
        filter.instructorId = userId;
    }

    if (startDate || endDate) {
        filter.meetingDate = {};
        if (startDate) filter.meetingDate.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.meetingDate.$lte = end;
        }
    }

    const records = await Attendance.find(filter)
        .populate('studentId', 'fullName email avatar')
        .populate('eventId', 'title date startTime')
        .sort({ meetingDate: -1 });

    res.status(200).json({
        success: true,
        course: {
            _id: course._id,
            title: course.title,
            code: course.code
        },
        total: records.length,
        data: records
    });
});

// @desc    Get student attendance summary
// @route   GET /api/attendance/student/:studentId/summary
// @access  Private (Instructor/Admin)
const getStudentAttendanceSummary = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { courseId, startDate, endDate } = req.query;
    const userRole = req.user.role;
    const userId = req.user._id;

    // Check student exists
    const student = await User.findById(studentId);
    if (!student) {
        return res.status(404).json({ message: 'Student not found' });
    }

    // Build filter
    const filter = { studentId };

    if (courseId) filter.courseId = courseId;

    if (userRole === 'instructor') {
        filter.instructorId = userId;
    }

    if (startDate || endDate) {
        filter.meetingDate = {};
        if (startDate) filter.meetingDate.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.meetingDate.$lte = end;
        }
    }

    const records = await Attendance.find(filter)
        .populate('eventId', 'title date')
        .populate('courseId', 'title code')
        .sort({ meetingDate: -1 });

    const total = records.length;
    const attended = records.filter(r => r.status === 'attended').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;

    res.status(200).json({
        success: true,
        student: {
            _id: student._id,
            fullName: student.fullName,
            email: student.email
        },
        summary: {
            total,
            attended,
            absent,
            late,
            excused,
            attendancePercentage: total > 0 ? Math.round((attended / total) * 100) : 0
        },
        records
    });
});

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private (Instructor/Admin)
const updateAttendance = asyncHandler(async (req, res) => {
    let attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
        return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Check authorization
    if (req.user.role === 'instructor' && attendance.instructorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this record' });
    }

    const { status, remarks, duration, checkInTime, checkOutTime } = req.body;

    if (status) attendance.status = status;
    if (remarks !== undefined) attendance.remarks = remarks;
    if (duration !== undefined) attendance.duration = duration;
    if (checkInTime) attendance.checkInTime = checkInTime;
    if (checkOutTime) attendance.checkOutTime = checkOutTime;

    await attendance.save();

    await attendance.populate('studentId', 'fullName email');
    await attendance.populate('eventId', 'title date');

    res.status(200).json({
        success: true,
        message: 'Attendance updated successfully',
        data: attendance
    });
});

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private (Admin only)
const deleteAttendance = asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'sub-admin') {
        return res.status(403).json({ message: 'Only admins can delete attendance records' });
    }

    const attendance = await Attendance.findByIdAndDelete(req.params.id);

    if (!attendance) {
        return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.status(200).json({
        success: true,
        message: 'Attendance record deleted successfully'
    });
});

// @desc    Bulk create attendance records
// @route   POST /api/attendance/bulk
// @access  Private (Instructor/Admin)
const bulkCreateAttendance = asyncHandler(async (req, res) => {
    const { records } = req.body;
    const instructorId = req.user._id;

    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: 'Records array is required and must not be empty' });
    }

    const createdRecords = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
        try {
            const { eventId, studentId, status, courseId, remarks, duration, checkInTime, checkOutTime } = records[i];

            if (!eventId || !studentId) {
                errors.push({ index: i, error: 'Event ID and Student ID are required' });
                continue;
            }

            const event = await Event.findById(eventId);
            if (!event) {
                errors.push({ index: i, error: 'Event not found' });
                continue;
            }

            // Check authorization
            if (event.instructor.toString() !== instructorId.toString() && req.user.role !== 'admin') {
                errors.push({ index: i, error: 'Not authorized for this event' });
                continue;
            }

            // Check if already exists
            let attendance = await Attendance.findOne({ eventId, studentId });

            if (!attendance) {
                attendance = await Attendance.create({
                    eventId,
                    studentId,
                    instructorId,
                    courseId: courseId || event.course,
                    status: status || 'attended',
                    meetingDate: event.date,
                    remarks,
                    duration,
                    checkInTime,
                    checkOutTime,
                    recordedType: 'manual'
                });
            }

            createdRecords.push(attendance);
        } catch (err) {
            errors.push({ index: i, error: err.message });
        }
    }

    res.status(201).json({
        success: createdRecords.length > 0,
        created: createdRecords.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        data: createdRecords
    });
});

module.exports = {
    createAttendance,
    getAttendance,
    getEventAttendance,
    getCourseAttendance,
    getStudentAttendanceSummary,
    updateAttendance,
    deleteAttendance,
    bulkCreateAttendance
};
