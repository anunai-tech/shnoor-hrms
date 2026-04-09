import { useState, useEffect } from 'react'
import { getAttendance, getEmployees } from '../../services/managerService'
import api from '../../services/api'

function Badge({ status }) {
  const styles = {
    'Present':  'bg-green-50 text-green-600',
    'Absent':   'bg-red-50 text-red-500',
    'Late':     'bg-yellow-50 text-yellow-600',
    'On Leave': 'bg-blue-50 text-blue-600',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Attendance() {
  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')

  const [showMarkModal, setShowMarkModal] = useState(false)
  const [markForm, setMarkForm] = useState({ user_id: '', date: '', status: 'Present', clock_in: '09:00', clock_out: '18:00' })

  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [editForm, setEditForm] = useState({ clock_in: '', clock_out: '', status: '' })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [attRes, empRes] = await Promise.all([
        getAttendance(),
        getEmployees()
      ])
      setRecords(attRes.data.data)
      const emps = empRes.data.data
      setEmployees(emps)
      if (emps.length > 0) {
        setMarkForm(prev => ({ ...prev, user_id: emps[0].id }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = records.filter(r => {
    const name = `${r.first_name} ${r.last_name}`.toLowerCase()
    const matchesSearch = name.includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter
    const matchesDate = !dateFilter || r.date?.startsWith(dateFilter)
    return matchesSearch && matchesStatus && matchesDate
  })

  const present = records.filter(r => r.status === 'Present').length
  const absent = records.filter(r => r.status === 'Absent').length
  const late = records.filter(r => r.status === 'Late').length
  const onLeave = records.filter(r => r.status === 'On Leave').length

  const handleMarkAttendance = async () => {
    try {
      await api.post('/manager/attendance/mark', markForm)
      setShowMarkModal(false)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark attendance')
    }
  }

  const openEdit = (record) => {
    setSelectedRecord(record)
    setEditForm({ clock_in: record.clock_in || '', clock_out: record.clock_out || '', status: record.status })
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    try {
      await api.put(`/manager/attendance/${selectedRecord.id}`, editForm)
      setShowEditModal(false)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update attendance')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>
          <p className="text-sm text-gray-400 mt-1">View and manage employee attendance records</p>
        </div>
        <button onClick={() => setShowMarkModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
          + Mark Attendance
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Present', value: present, color: 'text-green-600' },
          { label: 'Total Absent', value: absent, color: 'text-red-500' },
          { label: 'Late Arrivals', value: late, color: 'text-yellow-500' },
          { label: 'On Leave', value: onLeave, color: 'text-blue-500' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{item.label}</p>
            <p className={`text-3xl font-bold mt-2 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-48" />
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-2">
            {['All', 'Present', 'Absent', 'Late', 'On Leave'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
                  ${statusFilter === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Employee</th>
                <th className="text-left px-6 py-3 font-medium">Date</th>
                <th className="text-left px-6 py-3 font-medium">Clock In</th>
                <th className="text-left px-6 py-3 font-medium">Clock Out</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-sm text-gray-400">No records found</td></tr>
              ) : (
                filtered.map((record, index) => (
                  <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{record.first_name} {record.last_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{record.clock_in || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{record.clock_out || '—'}</td>
                    <td className="px-6 py-4"><Badge status={record.status} /></td>
                    <td className="px-6 py-4">
                      <button onClick={() => openEdit(record)}
                        className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Showing {filtered.length} of {records.length} records</p>
        </div>
      </div>

      {/* MARK ATTENDANCE MODAL */}
      {showMarkModal && (
        <Modal title="Mark Attendance" onClose={() => setShowMarkModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select value={markForm.user_id} onChange={(e) => setMarkForm({ ...markForm, user_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={markForm.date} onChange={(e) => setMarkForm({ ...markForm, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={markForm.status} onChange={(e) => setMarkForm({ ...markForm, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option>Present</option>
                <option>Absent</option>
                <option>Late</option>
                <option>On Leave</option>
              </select>
            </div>
            {(markForm.status === 'Present' || markForm.status === 'Late') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clock In</label>
                  <input type="time" value={markForm.clock_in} onChange={(e) => setMarkForm({ ...markForm, clock_in: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clock Out</label>
                  <input type="time" value={markForm.clock_out} onChange={(e) => setMarkForm({ ...markForm, clock_out: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleMarkAttendance}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              Save Attendance
            </button>
            <button onClick={() => setShowMarkModal(false)}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedRecord && (
        <Modal title="Edit Attendance Record" onClose={() => setShowEditModal(false)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-800">{selectedRecord.first_name} {selectedRecord.last_name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(selectedRecord.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option>Present</option>
                <option>Absent</option>
                <option>Late</option>
                <option>On Leave</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clock In</label>
                <input type="text" value={editForm.clock_in} onChange={(e) => setEditForm({ ...editForm, clock_in: e.target.value })}
                  placeholder="09:00"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clock Out</label>
                <input type="text" value={editForm.clock_out} onChange={(e) => setEditForm({ ...editForm, clock_out: e.target.value })}
                  placeholder="18:00"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleEditSave}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              Save Changes
            </button>
            <button onClick={() => setShowEditModal(false)}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}

    </div>
  )
}

export default Attendance