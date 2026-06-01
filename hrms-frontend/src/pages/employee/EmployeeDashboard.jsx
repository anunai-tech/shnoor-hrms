import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMyAttendance, getMyLeaves } from '../../services/employeeService'
import api from '../../services/api'

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

const getTodayString = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}

const timeStrToMinutes = (t) => {
  if (!t) return null
  const parts = t.split(':')
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

const getStatusChip = (record, lateThreshold, workStart) => {
  if (!record) return { label: 'Not Started', color: 'bg-gray-100 text-gray-500' }
  if (record.clock_out) return { label: 'Done', color: 'bg-blue-50 text-blue-600' }
  if (record.lunch_start && !record.lunch_end) return { label: 'On Lunch Break', color: 'bg-amber-50 text-amber-600' }
  if (record.status === 'Late') return { label: 'Late', color: 'bg-yellow-50 text-yellow-600' }
  return { label: 'Working', color: 'bg-green-50 text-green-600' }
}

function AttendanceProgressBar({ clockIn, workStart, workEnd }) {
  const [pct, setPct] = useState(0)
  const [overtime, setOvertime] = useState(false)

  useEffect(() => {
    const compute = () => {
      const now = new Date()
      const nowMins = now.getHours() * 60 + now.getMinutes()
      const startMins = timeStrToMinutes(workStart) || timeStrToMinutes(clockIn) || 0
      const endMins   = timeStrToMinutes(workEnd) || (startMins + 540)
      const totalMins = endMins - startMins
      if (totalMins <= 0) return
      const elapsed = nowMins - startMins
      const computed = Math.min(Math.max(Math.round((elapsed / totalMins) * 100), 0), 100)
      setPct(computed)
      setOvertime(nowMins > endMins)
    }
    compute()
    const interval = setInterval(compute, 60000)
    return () => clearInterval(interval)
  }, [clockIn, workStart, workEnd])

  const fmt = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-body text-xs text-gray-400">Work day progress</span>
        <span className={`font-display text-xs font-semibold ${overtime ? 'text-orange-500' : 'text-gray-500'}`}>
          {overtime ? `Overtime` : `${pct}%`}
        </span>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${overtime ? 'bg-orange-400' : 'bg-green-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="font-body text-xs text-gray-300">{fmt(workStart)}</span>
        <span className="font-body text-xs text-gray-300">{fmt(workEnd)}</span>
      </div>
    </div>
  )
}

function EmployeeDashboard() {
  const { user } = useAuth()

  const [todayRecord,      setTodayRecord]      = useState(null)
  const [recentAttendance, setRecentAttendance] = useState([])
  const [actionLoading,    setActionLoading]    = useState(false)
  const [companySettings,  setCompanySettings]  = useState(null)
  const [leaveBalance, setLeaveBalance] = useState([
    { type: 'Paid Leaves',   total: 12,   used: 0, remaining: 12,   isUnpaid: false },
    { type: 'Sick Leaves',   total: 6,    used: 0, remaining: 6,    isUnpaid: false },
    { type: 'Casual Leaves', total: 6,    used: 0, remaining: 6,    isUnpaid: false },
    { type: 'Unpaid Leaves', total: null, used: 0, remaining: null, isUnpaid: true  },
  ])

  const loadAttendance = () => {
    const today = getTodayString()
    getMyAttendance().then(res => {
      const records = res.data.data
      setRecentAttendance(records.slice(0, 5))
      const rec = records.find(r => String(r.date).substring(0, 10) === today)
      setTodayRecord(rec || null)
    }).catch(console.error)
  }

  useEffect(() => {
    loadAttendance()
    api.get('/employee/company-settings').then(res => {
      if (res.data.success) setCompanySettings(res.data.data)
    }).catch(() => {})
    getMyLeaves().then(res => {
      const approved = res.data.data.filter(l => l.status === 'Approved')
      const paidUsed   = approved.filter(l => l.leave_type === 'Paid Leave').reduce((s, l) => s + Number(l.days), 0)
      const sickUsed   = approved.filter(l => l.leave_type === 'Sick Leave').reduce((s, l) => s + Number(l.days), 0)
      const casualUsed = approved.filter(l => l.leave_type === 'Casual Leave').reduce((s, l) => s + Number(l.days), 0)
      const unpaidUsed = approved.filter(l => l.leave_type === 'Unpaid Leave').reduce((s, l) => s + Number(l.days), 0)
      setLeaveBalance([
        { type: 'Paid Leaves',   total: 12,   used: paidUsed,   remaining: Math.max(0, 12 - paidUsed),   isUnpaid: false },
        { type: 'Sick Leaves',   total: 6,    used: sickUsed,   remaining: Math.max(0, 6 - sickUsed),    isUnpaid: false },
        { type: 'Casual Leaves', total: 6,    used: casualUsed, remaining: Math.max(0, 6 - casualUsed),  isUnpaid: false },
        { type: 'Unpaid Leaves', total: null, used: unpaidUsed, remaining: null,                          isUnpaid: true  },
      ])
    }).catch(console.error)
  }, [])

  const handleAction = async (endpoint, errMsg) => {
    setActionLoading(true)
    try {
      await api.post(endpoint)
      loadAttendance()
    } catch (err) {
      alert(err.response?.data?.message || errMsg)
    } finally {
      setActionLoading(false)
    }
  }

  const isClockedIn  = !!todayRecord?.clock_in && !todayRecord?.clock_out
  const isClockedOut = !!todayRecord?.clock_out
  const isOnLunch    = !!todayRecord?.lunch_start && !todayRecord?.lunch_end
  const hasHadLunch  = !!todayRecord?.lunch_start && !!todayRecord?.lunch_end
  const status       = getStatusChip(todayRecord)

  const mainBtn = {
    label: isClockedOut ? 'Attendance Done ✓' : isOnLunch ? 'On Lunch Break' : isClockedIn ? 'Clock Out' : 'Clock In',
    style: isClockedOut ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : isOnLunch ? 'bg-amber-400 text-white cursor-not-allowed' : isClockedIn ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white',
    action: isClockedOut || isOnLunch ? null : isClockedIn ? () => handleAction('/employee/clock-out', 'Failed to clock out') : () => handleAction('/employee/clock-in', 'Failed to clock in')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Welcome back, {user?.first_name}!</p>
      </div>

      {/* Attendance Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-base font-semibold text-gray-800">Today's Attendance</h2>
          <span className={`font-display text-xs font-semibold px-3 py-1 rounded-full ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-5">
          <button
            onClick={mainBtn.action}
            disabled={!mainBtn.action || actionLoading}
            className={`font-display px-6 py-2.5 rounded-xl text-sm font-semibold transition ${mainBtn.style} disabled:opacity-60`}
          >
            {actionLoading ? '...' : mainBtn.label}
          </button>

          {isClockedIn && !isClockedOut && (
            isOnLunch ? (
              <button onClick={() => handleAction('/employee/lunch-end', 'Failed to end lunch')}
                disabled={actionLoading}
                className="font-display px-6 py-2.5 rounded-xl text-sm font-semibold bg-amber-400 hover:bg-amber-500 text-white transition disabled:opacity-60">
                {actionLoading ? '...' : 'End Lunch Break'}
              </button>
            ) : !hasHadLunch ? (
              <button onClick={() => handleAction('/employee/lunch-start', 'Failed to start lunch')}
                disabled={actionLoading}
                className="font-display px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition disabled:opacity-60">
                {actionLoading ? '...' : 'Start Lunch Break'}
              </button>
            ) : null
          )}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-b border-gray-50">
          {[
            { label: 'Clock In',     value: todayRecord?.clock_in  || '—' },
            { label: 'Clock Out',    value: todayRecord?.clock_out || '—' },
            { label: 'Lunch',        value: todayRecord?.lunch_start ? `${todayRecord.lunch_start} – ${todayRecord.lunch_end || 'ongoing'}` : '—' },
            { label: 'Working Hrs',  value: formatMinutes(todayRecord?.working_minutes) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="font-body text-xs text-gray-400 mb-1">{label}</p>
              <p className="font-display text-sm font-semibold text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar — only show when clocked in */}
        {isClockedIn && companySettings && (
          <AttendanceProgressBar
            clockIn={todayRecord?.clock_in}
            workStart={companySettings.work_start_time}
            workEnd={companySettings.work_end_time}
          />
        )}
      </div>

      {/* Leave Balance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {leaveBalance.map(lb => (
          <div key={lb.type} className={`rounded-xl p-5 shadow-sm border ${lb.isUnpaid ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'}`}>
            <p className={`font-body text-sm font-medium ${lb.isUnpaid ? 'text-orange-500' : 'text-gray-500'}`}>{lb.type}</p>
            <p className={`font-display text-3xl font-bold mt-2 ${lb.isUnpaid ? 'text-orange-600' : 'text-gray-800'}`}>
              {lb.isUnpaid ? lb.used : lb.remaining}
            </p>
            <p className="font-body text-xs text-gray-400 mt-1">
              {lb.isUnpaid ? 'days taken (approved)' : `${lb.used} used of ${lb.total}`}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Attendance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-display text-base font-semibold text-gray-800">Recent Attendance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Date','Clock In','Clock Out','Working Hrs','Status'].map(h => (
                  <th key={h} className="font-display text-left px-6 py-3 text-xs font-medium text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAttendance.length === 0 ? (
                <tr><td colSpan="5" className="font-body text-center py-8 text-sm text-gray-400">No attendance records yet</td></tr>
              ) : recentAttendance.map(record => (
                <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-3 text-sm text-gray-700">{formatDate(record.date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{record.clock_in || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{record.clock_out || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{formatMinutes(record.working_minutes)}</td>
                  <td className="px-6 py-3">
                    <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium ${
                      record.status === 'Present' ? 'bg-green-50 text-green-600' :
                      record.status === 'Late'    ? 'bg-yellow-50 text-yellow-600' :
                      'bg-red-50 text-red-500'}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default EmployeeDashboard