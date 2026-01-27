import { useState, useEffect } from 'react';
import { Download, Plus, Edit2, Trash2, Search, BarChart3 } from 'lucide-react';
import '../../assets/InstructorAttendance.css';

function InstructorAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [dateRange, setDateRange] = useState('');

  const [formData, setFormData] = useState({
    eventId: '',
    studentId: '',
    status: 'attended',
    remarks: '',
    duration: '',
    checkInTime: '',
    checkOutTime: ''
  });

  // Fetch instructor's courses and events on mount
  useEffect(() => {
    loadCoursesAndEvents();
    loadAttendance();
  }, []);

  // Apply filters whenever filter values change
  useEffect(() => {
    applyFilters();
  }, [attendanceRecords, searchTerm, selectedStudent, selectedCourse, dateRange]);

  const loadCoursesAndEvents = async () => {
    try {
      const api = await import('../../api');
      
      // Load instructor's courses
      const coursesRes = await api.getInstructorCourses?.() || (await api.getCourses());
      setCourses(Array.isArray(coursesRes) ? coursesRes : coursesRes?.data || []);

      // Load instructor's events (upcoming)
      const eventsRes = await api.getUpcomingClasses?.() || (await api.getEvents());
      const eventList = Array.isArray(eventsRes) ? eventsRes : eventsRes?.upcoming || eventsRes?.data || [];
      setEvents(eventList);
    } catch (err) {
      console.error('Failed to load courses/events:', err);
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const api = await import('../../api');
      const res = await api.getAttendance({ limit: 100, page: 1 });
      
      if (res.success && Array.isArray(res.data)) {
        setAttendanceRecords(res.data);
      } else if (Array.isArray(res)) {
        setAttendanceRecords(res);
      } else {
        setAttendanceRecords([]);
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
      alert('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...attendanceRecords];

    // Filter by search term (student name/email)
    if (searchTerm) {
      filtered = filtered.filter(record => {
        const studentName = record.studentId?.fullName || '';
        const studentEmail = record.studentId?.email || '';
        const term = searchTerm.toLowerCase();
        return studentName.toLowerCase().includes(term) || studentEmail.toLowerCase().includes(term);
      });
    }

    // Filter by selected student
    if (selectedStudent) {
      filtered = filtered.filter(record => record.studentId?._id === selectedStudent);
    }

    // Filter by course
    if (selectedCourse) {
      filtered = filtered.filter(record => record.courseId?._id === selectedCourse);
    }

    // Filter by date
    if (dateRange) {
      filtered = filtered.filter(record => {
        const meetingDate = new Date(record.meetingDate);
        const selectedDate = new Date(dateRange);
        return meetingDate.toDateString() === selectedDate.toDateString();
      });
    }

    setFilteredRecords(filtered);
  };

  const handleAddNew = () => {
    setFormData({
      eventId: '',
      studentId: '',
      status: 'attended',
      remarks: '',
      duration: '',
      checkInTime: '',
      checkOutTime: ''
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleEdit = (record) => {
    setFormData({
      eventId: record.eventId?._id || '',
      studentId: record.studentId?._id || '',
      status: record.status,
      remarks: record.remarks || '',
      duration: record.duration || '',
      checkInTime: record.checkInTime || '',
      checkOutTime: record.checkOutTime || ''
    });
    setEditingId(record._id);
    setShowModal(true);
  };

  const handleViewStats = async (studentId) => {
    try {
      const api = await import('../../api');
      const res = await api.getStudentAttendanceSummary(studentId, {
        courseId: selectedCourse || undefined
      });
      
      if (res.success) {
        setSelectedStudent(res.student);
        setStudentStats(res.summary);
        setShowStatsModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch student stats:', err);
      alert('Failed to load student statistics');
    }
  };

  const handleSave = async () => {
    if (!formData.eventId || !formData.studentId) {
      alert('Please select event and student');
      return;
    }

    try {
      const api = await import('../../api');
      
      if (editingId) {
        // Update existing
        await api.updateAttendance(editingId, formData);
        alert('Attendance updated successfully');
      } else {
        // Create new
        await api.createAttendance(formData);
        alert('Attendance recorded successfully');
      }

      setShowModal(false);
      loadAttendance();
    } catch (err) {
      console.error('Failed to save attendance:', err);
      alert('Failed to save attendance');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    try {
      const api = await import('../../api');
      await api.deleteAttendance(id);
      alert('Attendance record deleted');
      loadAttendance();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete record');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Event', 'Student Name', 'Student Email', 'Status', 'Course', 'Duration', 'Remarks'];
    const rows = filteredRecords.map(record => [
      new Date(record.meetingDate).toLocaleDateString(),
      record.eventId?.title || 'N/A',
      record.studentId?.fullName || 'N/A',
      record.studentId?.email || 'N/A',
      record.status,
      record.courseId?.title || 'N/A',
      record.duration || 'N/A',
      record.remarks || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Calculate statistics
  const stats = {
    total: filteredRecords.length,
    attended: filteredRecords.filter(r => r.status === 'attended').length,
    absent: filteredRecords.filter(r => r.status === 'absent').length,
    late: filteredRecords.filter(r => r.status === 'late').length,
    excused: filteredRecords.filter(r => r.status === 'excused').length
  };

  const attendancePercentage = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;

  return (
    <div className="instructor-attendance">
      <div className="attendance-header">
        <div>
          <h2>Attendance Records</h2>
          <p className="subtitle">Track and manage student attendance for your live sessions</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Records</div>
        </div>
        <div className="stat-card attended">
          <div className="stat-value">{stats.attended}</div>
          <div className="stat-label">Attended</div>
        </div>
        <div className="stat-card absent">
          <div className="stat-value">{stats.absent}</div>
          <div className="stat-label">Absent</div>
        </div>
        <div className="stat-card late">
          <div className="stat-value">{stats.late}</div>
          <div className="stat-label">Late</div>
        </div>
        <div className="stat-card excused">
          <div className="stat-value">{stats.excused}</div>
          <div className="stat-label">Excused</div>
        </div>
        <div className="stat-card percentage">
          <div className="stat-value">{attendancePercentage}%</div>
          <div className="stat-label">Attendance Rate</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
          />
          <Search size={18} className="search-icon" />
        </div>

        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="form-select"
        >
          <option value="">All Students</option>
          {students.map(student => (
            <option key={student._id} value={student._id}>
              {student.fullName || student.name} - {student.email}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="form-control"
          placeholder="Select Date"
        />

        <button className="btn btn-secondary" onClick={handleExportCSV} disabled={loading}>
          <Download size={18} /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="table-responsive">
        {loading ? (
          <div className="loading">Loading attendance records...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="no-data">No attendance records found</div>
        ) : (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Student</th>
                <th>Email</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => (
                <tr key={record._id} className={`status-${record.status}`}>
                  <td>{new Date(record.meetingDate).toLocaleDateString()}</td>
                  <td>{record.eventId?.title || 'N/A'}</td>
                  <td>{record.studentId?.fullName || 'N/A'}</td>
                  <td>{record.studentId?.email || 'N/A'}</td>
                  <td>
                    <span className={`badge badge-${record.status}`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </td>
                  <td>{record.duration ? `${record.duration} min` : '-'}</td>
                  <td>{record.remarks || '-'}</td>
                  <td className="actions">
                    <button
                      className="btn-icon stats"
                      onClick={() => handleViewStats(record.studentId?._id)}
                      title="View Stats"
                    >
                      <BarChart3 size={16} />
                    </button>
                    <button
                      className="btn-icon edit"
                      onClick={() => handleEdit(record)}
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit Attendance' : 'Add Attendance Record'}</h3>
            
            <div className="form-group">
              <label>Event *</label>
              <select
                value={formData.eventId}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                className="form-control"
              >
                <option value="">Select Event</option>
                {events.map(event => (
                  <option key={event._id} value={event._id}>
                    {event.title || event.eventTitle} - {new Date(event.date || event.meetingDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-control"
              >
                <option value="attended">Attended</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
            </div>

            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="form-control"
                placeholder="e.g., 60"
              />
            </div>

            <div className="form-group">
              <label>Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="form-control"
                rows="3"
                placeholder="Add any remarks..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingId ? 'Update' : 'Add'} Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Stats Modal */}
      {showStatsModal && selectedStudent && studentStats && (
        <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Attendance Summary</h3>
            
            <div className="student-info">
              <p><strong>Student:</strong> {selectedStudent.fullName}</p>
              <p><strong>Email:</strong> {selectedStudent.email}</p>
            </div>

            <div className="stats-summary">
              <div className="stat-row">
                <span>Total Sessions:</span>
                <strong>{studentStats.total}</strong>
              </div>
              <div className="stat-row attended">
                <span>Attended:</span>
                <strong>{studentStats.attended}</strong>
              </div>
              <div className="stat-row absent">
                <span>Absent:</span>
                <strong>{studentStats.absent}</strong>
              </div>
              <div className="stat-row late">
                <span>Late:</span>
                <strong>{studentStats.late}</strong>
              </div>
              <div className="stat-row excused">
                <span>Excused:</span>
                <strong>{studentStats.excused}</strong>
              </div>
              <div className="stat-row percentage">
                <span>Attendance Rate:</span>
                <strong>{studentStats.attendancePercentage}%</strong>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowStatsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstructorAttendance;
