import React, { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../services/api'

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const FULL_MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December']

const formatDate = (val) => {
  if (!val) return '—'
  const s = String(val).substring(0, 10)
  const [year, month, day] = s.split('-')
  return `${parseInt(day)} ${SHORT_MONTHS[parseInt(month, 10) - 1]} ${year}`
}

const formatMinutes = (mins) => {
  if (mins === null || mins === undefined) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const getTodayIST = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}

function StatusBadge({ status }) {
  const styles = {
    Present:   'bg-green-50 text-green-600',
    Late:      'bg-yellow-50 text-yellow-600',
    Absent:    'bg-red-50 text-red-500',
    'On Leave':'bg-amber-50 text-amber-700',
  }
  return (
    <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

// Month-year picker dropdown
function MonthYearPicker({ year, month, onChange, onClose }) {
  const [pickerYear, setPickerYear] = useState(year)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 w-64">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setPickerYear(y => y - 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-display text-sm font-bold text-gray-800">{pickerYear}</span>
        <button onClick={() => setPickerYear(y => y + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {SHORT_MONTHS.map((m, i) => {
          const isSelected = pickerYear === year && (i + 1) === month
          return (
            <button key={m}
              onClick={() => { onChange(pickerYear, i + 1); onClose() }}
              className={`font-display text-xs font-semibold py-2 rounded-lg transition
                ${isSelected ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
              {m}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EditModal({ record, onClose, onSaved, employees, defaultDate }) {
  const isNew = !record.id
  const [form, setForm] = useState({
    user_id:     record.user_id    || (employees[0]?.id ?? ''),
    date:        record.date       || defaultDate || '',
    status:      record.status     || 'Present',
    clock_in:    record.clock_in   || '',
    clock_out:   record.clock_out  || '',
    lunch_start: record.lunch_start || '',
    lunch_end:   record.lunch_end   || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (isNew) await api.post('/manager/attendance/mark', form)
      else       await api.put(`/manager/attendance/${record.id}`, form)
      onSaved(); onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const showTimes = form.status === 'Present' || form.status === 'Late'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-display text-base font-semibold text-gray-800">
            {isNew ? 'Mark Attendance' : `Edit — ${record.first_name} ${record.last_name}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {isNew && (
            <>
              <div>
                <label className="font-display block text-xs font-semibold text-gray-600 mb-1">Employee</label>
                <select value={form.user_id} onChange={e => setForm(f => ({...f, user_id: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-display block text-xs font-semibold text-gray-600 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </>
          )}
          <div>
            <label className="font-display block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Present</option><option>Absent</option><option>Late</option><option>On Leave</option>
            </select>
          </div>
          {showTimes && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[['clock_in','Clock In'],['clock_out','Clock Out']].map(([key,label]) => (
                  <div key={key}>
                    <label className="font-display block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                    <input type="time" value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['lunch_start','Lunch Start'],['lunch_end','Lunch End']].map(([key,label]) => (
                  <div key={key}>
                    <label className="font-display block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                    <input type="time" value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                ))}
              </div>
            </>
          )}
          {error && <p className="font-body text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={handleSave} disabled={saving}
            className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onClose}
            className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Expanded day detail — fixed height scrollable inline table
function DayDetail({ day, employees, onSaved }) {
  const [editRecord, setEditRecord] = useState(null)
  const todayIST = getTodayIST()
  const isFuture = day.date > todayIST

  const allRows = [
    ...(day.records || []).map(r => ({ ...r, _type: 'record' })),
    ...(day.absent_employees || []).map(e => ({ ...e, _type: 'absent' }))
  ]

  return (
    <tr>
      <td colSpan="8" className="px-0 py-0 border-b border-gray-100">
        <div className="bg-gray-50 border-t border-gray-100 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-3 sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
            <p className="font-display text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isFuture ? 'No records — future date' : `${day.records?.length || 0} records · ${day.absent_employees?.length || 0} absent`}
            </p>
            {!isFuture && (
              <button
                onClick={() => setEditRecord({ date: day.date, status: 'Present', clock_in: '', clock_out: '', lunch_start: '', lunch_end: '' })}
                className="font-display text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition">
                + Mark Attendance
              </button>
            )}
          </div>

          {allRows.length === 0 ? (
            <div className="px-6 py-6 text-center">
              <p className="font-body text-sm text-gray-400">
                {isFuture ? 'Attendance not yet recorded for this date.' : 'No attendance data for this date.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Employee','Role','Status','Clock In','Clock Out','Lunch','Working Hrs',''].map(h => (
                    <th key={h} className="font-display text-left px-4 py-2.5 text-xs font-medium text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-white transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${row._type === 'absent' ? 'bg-gray-200' : 'bg-primary'}`}>
                          <span className={`font-display text-xs font-bold ${row._type === 'absent' ? 'text-gray-500' : 'text-white'}`}>
                            {row.first_name?.charAt(0)}
                          </span>
                        </div>
                        <span className="font-display text-sm font-medium text-gray-800">{row.first_name} {row.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-body text-xs text-gray-400 capitalize">{row.role || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row._type === 'absent' ? 'Absent' : row.status} />
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-600">{row.clock_in  || '—'}</td>
                    <td className="px-4 py-3 font-body text-sm text-gray-600">{row.clock_out || '—'}</td>
                    <td className="px-4 py-3 font-body text-sm text-gray-600">
                      {row.lunch_start ? `${row.lunch_start} – ${row.lunch_end || 'ongoing'}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-600">{formatMinutes(row.working_minutes)}</td>
                    <td className="px-4 py-3">
                      {row._type === 'absent' ? (
                        <button onClick={() => setEditRecord({ user_id: row.id, first_name: row.first_name, last_name: row.last_name, date: day.date, status: 'Present', clock_in: '', clock_out: '', lunch_start: '', lunch_end: '' })}
                          className="font-display text-xs text-green-600 hover:underline font-semibold">Mark Present</button>
                      ) : (
                        <button onClick={() => setEditRecord(row)}
                          className="font-display text-xs text-primary hover:underline font-semibold">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {editRecord && (
          <EditModal
            record={editRecord}
            employees={employees}
            defaultDate={day.date}
            onClose={() => setEditRecord(null)}
            onSaved={() => { setEditRecord(null); onSaved() }}
          />
        )}
      </td>
    </tr>
  )
}

function Attendance() {
  const todayIST = getTodayIST()
  const todayYear  = parseInt(todayIST.substring(0, 4))
  const todayMonth = parseInt(todayIST.substring(5, 7))

  const [currentYear,   setCurrentYear]   = useState(todayYear)
  const [currentMonth,  setCurrentMonth]  = useState(todayMonth)
  const [showPicker,    setShowPicker]    = useState(false)
  const [summary,       setSummary]       = useState([])
  const [employees,     setEmployees]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [expandedDate,  setExpandedDate]  = useState(null)

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2,'0')}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryRes, empRes] = await Promise.all([
        api.get(`/manager/attendance/summary?month=${monthKey}`),
        api.get('/manager/employees')
      ])
      setSummary(summaryRes.data.data || [])
      setEmployees(empRes.data.data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [monthKey])

  useEffect(() => { fetchData() }, [fetchData])

  const handleMonthChange = (y, m) => {
    setCurrentYear(y); setCurrentMonth(m); setExpandedDate(null)
  }

  const toggleExpand = (date, isWeekend, isHoliday) => {
    if (isWeekend || isHoliday) return
    setExpandedDate(prev => prev === date ? null : date)
  }

  const handleSaved = async () => {
    await fetchData()
  }

  // Only count stats from past and today
  const workingDays  = summary.filter(d => !d.is_weekend && !d.holiday_name && d.date <= todayIST)
  const totalPresent = workingDays.reduce((s, d) => s + d.present + d.late, 0)
  const totalAbsent  = workingDays.reduce((s, d) => s + d.absent, 0)
  const totalLate    = workingDays.reduce((s, d) => s + d.late, 0)
  const totalOnLeave = workingDays.reduce((s, d) => s + d.on_leave, 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Attendance</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Monthly attendance overview for your team</p>
      </div>

      {/* Month-year picker header */}
      <div className="relative flex items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
        <button
          onClick={() => setShowPicker(p => !p)}
          className="flex items-center gap-2 font-display text-base font-bold text-gray-800 hover:text-primary transition">
          {FULL_MONTHS[currentMonth - 1]} {currentYear}
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showPicker && (
          <MonthYearPicker
            year={currentYear}
            month={currentMonth}
            onChange={handleMonthChange}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>

      {/* Stat cards — only from past/today */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Present',  value: totalPresent,  color: 'text-green-600'  },
          { label: 'Total Absent',   value: totalAbsent,   color: 'text-red-500'    },
          { label: 'Late Arrivals',  value: totalLate,     color: 'text-yellow-500' },
          { label: 'On Leave',       value: totalOnLeave,  color: 'text-primary'    },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="font-body text-xs text-gray-400 uppercase tracking-wide">{item.label}</p>
            <p className={`font-display text-3xl font-bold mt-2 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Main attendance table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Date','Day','Type','Present','Absent','Late','On Leave',''].map(h => (
                <th key={h} className="font-display text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map(day => {
              const isToday    = day.date === todayIST
              const isFuture   = day.date > todayIST
              const isExpanded = expandedDate === day.date
              const isWeekend  = day.is_weekend
              const isHoliday  = !!day.holiday_name
              const clickable  = !isWeekend && !isHoliday

              return (
                <React.Fragment key={day.date}>
                  <tr
                    onClick={() => toggleExpand(day.date, isWeekend, isHoliday)}
                    className={`border-b border-gray-50 transition
                      ${isWeekend || isHoliday ? 'bg-gray-50 opacity-60' : isFuture ? 'opacity-50 cursor-default' : 'hover:bg-amber-50 cursor-pointer'}
                      ${isExpanded ? 'bg-amber-50 border-l-2 border-primary' : ''}
                    `}
                  >
                    <td className="px-5 py-3.5">
                      <p className={`font-display text-sm font-bold ${isToday ? 'text-primary' : 'text-gray-800'}`}>
                        {formatDate(day.date)}
                        {isToday && <span className="font-body text-xs text-primary ml-1.5 font-normal">(Today)</span>}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 font-body text-sm text-gray-500">{day.day_name}</td>
                    <td className="px-5 py-3.5">
                      {isHoliday ? (
                        <span className="font-display text-xs font-semibold bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full">Holiday</span>
                      ) : isWeekend ? (
                        <span className="font-display text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Weekend</span>
                      ) : (
                        <span className="font-display text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">Working Day</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {isWeekend || isHoliday ? <span className="text-gray-300">—</span> :
                        <span className="font-display text-sm font-semibold text-green-600">{isFuture ? '—' : day.present + day.late}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {isWeekend || isHoliday ? <span className="text-gray-300">—</span> :
                        <span className="font-display text-sm font-semibold text-red-500">{isFuture ? '—' : day.absent}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {isWeekend || isHoliday ? <span className="text-gray-300">—</span> :
                        <span className="font-display text-sm font-semibold text-yellow-600">{isFuture ? '—' : day.late}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {isWeekend || isHoliday ? (
                        <span className="font-body text-xs text-gray-400">{isHoliday ? day.holiday_name : ''}</span>
                      ) : (
                        <span className="font-display text-sm font-semibold text-amber-600">{isFuture ? '—' : day.on_leave}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {clickable && !isFuture && (
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <DayDetail
                      key={`detail-${day.date}`}
                      day={day}
                      employees={employees}
                      onSaved={handleSaved}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Attendance