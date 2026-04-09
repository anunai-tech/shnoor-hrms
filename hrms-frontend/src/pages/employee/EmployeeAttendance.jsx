import { useState, useEffect } from 'react'
import { getMyAttendance } from '../../services/employeeService'

function EmployeeAttendance() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyAttendance()
      .then(res => setAttendance(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const present = attendance.filter(a => a.status === 'Present').length
  const absent = attendance.filter(a => a.status === 'Absent').length
  const late = attendance.filter(a => a.status === 'Late').length

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Attendance</h1>
        <p className="text-sm text-gray-400 mt-1">View your attendance history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[['Present', present, 'text-green-600'],['Absent', absent, 'text-red-500'],['Late', late, 'text-yellow-500']].map(([label, val, color]) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className={`text-3xl font-bold mt-2 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">Date</th>
                <th className="text-left px-6 py-3 font-medium">Clock In</th>
                <th className="text-left px-6 py-3 font-medium">Clock Out</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-10 text-sm text-gray-400">No attendance records yet</td></tr>
              ) : (
                attendance.map(record => (
                  <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-700">{new Date(record.date).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.clock_in || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.clock_out || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Present' ? 'bg-green-50 text-green-600' :
                        record.status === 'Late' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-red-50 text-red-500'}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default EmployeeAttendance