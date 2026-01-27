const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    // Reference to the event/live meeting
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: [true, 'Event/Meeting ID is required']
    },
    // Reference to the student attending
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required']
    },
    // Course/Subject reference
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    // Instructor who took the attendance
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Instructor ID is required']
    },
    // Attendance status
    status: {
        type: String,
        enum: ['attended', 'absent', 'late', 'excused'],
        default: 'attended',
        required: true
    },
    // Meeting date (denormalized for easier querying)
    meetingDate: {
        type: Date,
        required: true
    },
    // Duration of attendance (in minutes) - optional
    duration: {
        type: Number,
        default: null
    },
    // Check-in time
    checkInTime: {
        type: Date,
        default: null
    },
    // Check-out time
    checkOutTime: {
        type: Date,
        default: null
    },
    // Remarks or notes
    remarks: {
        type: String,
        default: null
    },
    // Track if this is automatically recorded (from live session) or manually added
    recordedType: {
        type: String,
        enum: ['automatic', 'manual'],
        default: 'manual'
    }
}, {
    timestamps: true
});

// Index for efficient querying
attendanceSchema.index({ eventId: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ instructorId: 1, meetingDate: 1 });
attendanceSchema.index({ courseId: 1, meetingDate: 1 });
attendanceSchema.index({ studentId: 1, meetingDate: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
