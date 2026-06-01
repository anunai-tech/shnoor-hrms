import { useState, useEffect } from 'react'
import { getMyAttendance } from '../../services/employeeService'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const formatDate = (val) => {
  if (!val) return '—'
  const s = String(val).substring(0, 10)
  const [year, month, day] = s.split('-')
  return `${parseInt(day)} ${MONTHS[parseInt(month, 10) - 1]} ${year}`
}

const formatMinutes = (mins) => {
  if (mins === null || mins === undefined) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function EmployeeAttendance() {
  const [attendance, setAttendance] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    getMyAttendance()
      .then(res => setAttendance(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const present = attendance.filter(a => a.status === 'Present').length
  const absent  = attendance.filter(a => a.status === 'Absent').length
  const late    = attendance.filter(a => a.status === 'Late').length

  // Total working minutes across all records
  const totalWorkMins = attendance.reduce((sum, a) => sum + (a.working_minutes || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">My Attendance</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Your full attendance history</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Present',       value: present,                        color: 'text-green-600'  },
          { label: 'Absent',        value: absent,                         color: 'text-red-500'    },
          { label: 'Late',          value: late,                           color: 'text-yellow-500' },
          { label: 'Total Work Hrs',value: formatMinutes(totalWorkMins),   color: 'text-primary'    },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="font-body text-sm text-gray-500 font-medium">{label}</p>
            <p className={`font-display text-2xl font-bold mt-2 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="font-display text-left px-6 py-3 font-medium">Date</th>
                <th className="font-display text-left px-6 py-3 font-medium">Clock In</th>
                <th className="font-display text-left px-6 py-3 font-medium">Clock Out</th>
                <th className="font-display text-left px-6 py-3 font-medium">Lunch</th>
                <th className="font-display text-left px-6 py-3 font-medium">Working Hrs</th>
                <th className="font-display text-left px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan="6" className="font-body text-center py-10 text-sm text-gray-400">
                    No attendance records yet
                  </td>
                </tr>
              ) : (
                attendance.map(record => (
                  <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.clock_in || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.clock_out || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.lunch_start
                        ? `${record.lunch_start} – ${record.lunch_end || 'ongoing'}`
                        : '—'
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatMinutes(record.working_minutes)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Present' ? 'bg-green-50 text-green-600'  :
                        record.status === 'Late'    ? 'bg-yellow-50 text-yellow-600':
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