import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { clockIn, clockOut, getMyAttendance, getMyLeaves } from '../../services/managerService'

function SelfDashboard() {
  const { user } = useAuth()
  const [clockedIn, setClockedIn] = useState(false)
  const [clockedOut, setClockedOut] = useState(false)
  const [clockInTime, setClockInTime] = useState(null)
  const [clockOutTime, setClockOutTime] = useState(null)
  const [recentAttendance, setRecentAttendance] = useState([])
  const [leaveBalance, setLeaveBalance] = useState([
    { type: 'Paid Leaves', total: 12, used: 0, remaining: 12 },
    { type: 'Sick Leaves', total: 6, used: 0, remaining: 6 },
    { type: 'Casual Leaves', total: 6, used: 0, remaining: 6 },
  ])

  useEffect(() => {
    getMyAttendance()
      .then(res => {
        const records = res.data.data.slice(0, 5)
        setRecentAttendance(records)
        const today = new Date().toLocaleDateString('en-CA')
        const todayRecord = records.find(r => {
          const recordDate = new Date(r.date).toLocaleDateString('en-CA')
          return recordDate === today
        })
        if (todayRecord) {
          setClockInTime(todayRecord.clock_in)
          if (todayRecord.clock_out) {
            setClockOutTime(todayRecord.clock_out)
            setClockedIn(false)
            setClockedOut(true)
          } else if (todayRecord.clock_in) {
            setClockedIn(true)
            setClockedOut(false)
          }
        }
      })
      .catch(err => console.error(err))

    getMyLeaves()
      .then(res => {
        const leaves = res.data.data
        const approvedLeaves = leaves.filter(l => l.status === 'Approved')
        const paidUsed = approvedLeaves.filter(l => l.leave_type === 'Paid Leave').reduce((sum, l) => sum + Number(l.days), 0)
        const sickUsed = approvedLeaves.filter(l => l.leave_type === 'Sick Leave').reduce((sum, l) => sum + Number(l.days), 0)
        const casualUsed = approvedLeaves.filter(l => l.leave_type === 'Casual Leave').reduce((sum, l) => sum + Number(l.days), 0)
        setLeaveBalance([
          { type: 'Paid Leaves', total: 12, used: paidUsed, remaining: Math.max(0, 12 - paidUsed) },
          { type: 'Sick Leaves', total: 6, used: sickUsed, remaining: Math.max(0, 6 - sickUsed) },
          { type: 'Casual Leaves', total: 6, used: casualUsed, remaining: Math.max(0, 6 - casualUsed) },
        ])
      })
      .catch(err => console.error(err))
  }, [])

  const handleClockIn = async () => {
    try {
      const res = await clockIn()
      setClockInTime(res.data.data.clock_in)
      setClockedIn(true)
      setClockedOut(false)
    } catch (err) {
      alert(err.response?.data?.message || 'Already clocked in today')
    }
  }

  const handleClockOut = async () => {
    try {
      const res = await clockOut()
      setClockOutTime(res.data.data.clock_out)
      setClockedIn(false)
      setClockedOut(true)
    } catch (err) {
      alert(err.response?.data?.message || 'Error clocking out')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Welcome back, {user?.first_name}!</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Today's Attendance</h2>
        <div className="flex items-center gap-6">
          <button
            onClick={clockedOut ? undefined : clockedIn ? handleClockOut : handleClockIn}
            disabled={clockedOut}
            className={`px-8 py-3 rounded-xl text-white font-semibold text-sm transition
              ${clockedOut
                ? 'bg-gray-300 cursor-not-allowed'
                : clockedIn
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'}`}>
            {clockedOut ? 'Attendance Done ✓' : clockedIn ? 'Clock Out' : 'Clock In'}
          </button>
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Clock In</p>
              <p className="text-sm font-semibold text-gray-800">{clockInTime || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Clock Out</p>
              <p className="text-sm font-semibold text-gray-800">{clockOutTime || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {leaveBalance.map(lb => (
          <div key={lb.type} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-medium">{lb.type}</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{lb.remaining}</p>
            <p className="text-xs text-gray-400 mt-1">{lb.used} used of {lb.total}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Recent Attendance</h2>
        </div>
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
              {recentAttendance.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-8 text-sm text-gray-400">No attendance records yet</td></tr>
              ) : (
                recentAttendance.map(record => (
                  <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm text-gray-700">{new Date(record.date).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{record.clock_in || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{record.clock_out || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${record.status === 'Present' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
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

export default SelfDashboard