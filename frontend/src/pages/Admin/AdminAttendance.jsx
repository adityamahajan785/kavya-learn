import { useState, useEffect } from 'react';
import { Download, Plus, Edit2, Trash2, Search } from 'lucide-react';
import '../../assets/AdminAttendance.css';

function AdminAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
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

  // Fetch courses and events on mount
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
      
      // Load courses
      const coursesRes = await api.getCourses();
      setCourses(Array.isArray(coursesRes) ? coursesRes : []);

      // Load events
      const eventsRes = await api.getEvents();
      setEvents(Array.isArray(eventsRes) ? eventsRes : []);

      // Load students
      const studentsRes = await api.getStudents?.() || [];
      setStudents(Array.isArray(studentsRes) ? studentsRes : studentsRes?.data || []);
    } catch (err) {
      console.error('Failed to load courses/events/students:', err);
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

  return (
    <div className="admin-attendance">
      <div className="attendance-header">
        <h2>Attendance Management</h2>
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
                <th>Course</th>
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
                  <td>{record.courseId?.title || 'N/A'}</td>
                  <td>{record.duration ? `${record.duration} min` : '-'}</td>
                  <td>{record.remarks || '-'}</td>
                  <td className="actions">
                    <button
                      className="btn-icon edit"
                      onClick={() => handleEdit(record)}
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDelete(record._id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
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
                    {event.title} - {new Date(event.date).toLocaleDateString()}
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
    </div>
  );
}

export default AdminAttendance;
