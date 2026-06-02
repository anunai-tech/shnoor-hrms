import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Formats "09:00" → "9:00 AM", "22:00" → "10:00 PM"
const fmt24 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

function ShiftModal({ shift, onClose, onSaved, companyId }) {
  const isNew = !shift?.id
  const [form, setForm] = useState({
    name:                    shift?.name                    || '',
    start_time:              shift?.start_time              || '09:00',
    end_time:                shift?.end_time                || '18:00',
    is_overnight:            shift?.is_overnight            || false,
    late_threshold_mins:     shift?.late_threshold_mins     ?? 15,
    half_day_threshold_mins: shift?.half_day_threshold_mins ?? 240,
    break_allowed:           shift?.break_allowed           !== false,
    work_days:               shift?.work_days               || ['Mon','Tue','Wed','Thu','Fri'],
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      work_days: f.work_days.includes(day)
        ? f.work_days.filter(d => d !== day)
        : [...f.work_days, day]
    }))
  }

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) return setError('Shift name is required.')
    if (!form.start_time || !form.end_time) return setError('Start and end times are required.')
    if (form.work_days.length === 0) return setError('Select at least one working day.')
    try {
      setSaving(true)
      if (isNew) await api.post('/manager/shifts', form)
      else       await api.put(`/manager/shifts/${shift.id}`, form)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save shift.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-display text-base font-semibold text-gray-800">
            {isNew ? 'Add New Shift' : `Edit — ${shift.name}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="font-display block text-xs font-semibold text-gray-600 mb-1">Shift Name</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="e.g. Morning Shift, Night Shift"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-display block text-xs font-semibold text-gray-600 mb-1">Start Time</label>
              <input type="time" value={form.start_time} onChange={e => setForm(f => ({...f, start_time: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="font-display block text-xs font-semibold text-gray-600 mb-1">End Time</label>
              <input type="time" value={form.end_time} onChange={e => setForm(f => ({...f, end_time: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_overnight} onChange={e => setForm(f => ({...f, is_overnight: e.target.checked}))}
              className="w-4 h-4 accent-primary" />
            <span className="font-body text-sm text-gray-600">Overnight shift (crosses midnight)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-display block text-xs font-semibold text-gray-600 mb-1">Late Threshold (mins)</label>
              <input type="number" min={0} max={120} value={form.late_threshold_mins}
                onChange={e => setForm(f => ({...f, late_threshold_mins: parseInt(e.target.value) || 0}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="font-display block text-xs font-semibold text-gray-600 mb-1">Half Day Threshold (mins)</label>
              <input type="number" min={0} value={form.half_day_threshold_mins}
                onChange={e => setForm(f => ({...f, half_day_threshold_mins: parseInt(e.target.value) || 0}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="font-display block text-xs font-semibold text-gray-600 mb-2">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map(day => {
                const active = form.work_days.includes(day)
                return (
                  <button key={day} onClick={() => toggleDay(day)}
                    className={`font-display text-xs font-semibold px-3 py-1.5 rounded-lg border transition
                      ${active ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary'}`}>
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.break_allowed} onChange={e => setForm(f => ({...f, break_allowed: e.target.checked}))}
              className="w-4 h-4 accent-primary" />
            <span className="font-body text-sm text-gray-600">Allow break for this shift</span>
          </label>
          {error && <p className="font-body text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={handleSave} disabled={saving}
            className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
            {saving ? 'Saving...' : isNew ? 'Create Shift' : 'Save Changes'}
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

function ShiftEmployeesModal({ shift, onClose, onSaved }) {
  const [employees, setEmployees] = useState([])
  const [allEmployees, setAllEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [reassigning, setReassigning] = useState(null)
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/manager/shifts/${shift.id}/employees`),
      api.get('/manager/all-staff'),
    ]).then(([shiftRes, allRes]) => {
      setEmployees(shiftRes.data.data)
      setAllEmployees(allRes.data.data)
    }).catch(() => setError('Failed to load staff'))
    .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [shift.id])

  const reassign = async (userId, targetShiftId) => {
    setReassigning(userId)
    try {
      await api.post('/manager/shifts/assign', { user_id: userId, shift_id: targetShiftId })
      load()
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reassign.')
    } finally { setReassigning(null) }
  }

  // Employees not in this shift — for the "Add Employee" dropdown
  const notInShift = allEmployees.filter(e => !employees.find(se => se.id === e.id))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-display text-base font-semibold text-gray-800">{shift.name}</h3>
            <p className="font-body text-xs text-gray-400">{shift.shift_code} · {fmt24(shift.start_time)} – {fmt24(shift.end_time)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <p className="font-display text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {employees.length} employee{employees.length !== 1 ? 's' : ''} in this shift
          </p>
          {notInShift.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowAddDropdown(v => !v)}
                className="font-display text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition">
                + Add Employee
              </button>
              {showAddDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-10 w-56 max-h-48 overflow-y-auto">
                  {notInShift.map(emp => (
                    <button key={emp.id} onClick={() => { reassign(emp.id, shift.id); setShowAddDropdown(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition">
                      <p className="font-display font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                      <p className="font-body text-xs text-gray-400 capitalize">{emp.role} · {emp.designation || emp.department || '—'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : employees.length === 0 ? (
            <p className="font-body text-center text-sm text-gray-400 py-10">No employees in this shift yet.</p>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="flex items-center justify-between px-6 py-3 border-b border-gray-50 hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-display text-xs font-bold text-primary">{emp.first_name?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-display text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                    <p className="font-body text-xs text-gray-400 capitalize">{emp.role} · {emp.department || '—'}</p>
                  </div>
                </div>
                {reassigning === emp.id ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MoveToShiftDropdown empId={emp.id} currentShiftId={shift.id} onReassign={reassign} />
                )}
              </div>
            ))
          )}
          {error && <p className="font-body text-xs text-red-500 px-6 py-2">{error}</p>}
        </div>
      </div>
    </div>
  )
}

function MoveToShiftDropdown({ empId, currentShiftId, onReassign }) {
  const [shifts, setShifts] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open && shifts.length === 0) {
      api.get('/manager/shifts').then(r => setShifts(r.data.data)).catch(() => {})
    }
  }, [open])

  const others = shifts.filter(s => s.id !== currentShiftId)

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="font-display text-xs text-primary hover:underline font-semibold">
        Move to shift
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-10 w-44 max-h-40 overflow-y-auto">
          {others.length === 0 ? (
            <p className="font-body text-xs text-gray-400 px-4 py-3">No other shifts</p>
          ) : others.map(s => (
            <button key={s.id} onClick={() => { onReassign(empId, s.id); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition">
              <p className="font-display font-medium text-gray-700">{s.name}</p>
              <p className="font-body text-xs text-gray-400">{s.shift_code}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ManagerSettings() {
  const { user } = useAuth()

  const [passwordData, setPasswordData] = useState({
    current_password: '', new_password: '', confirm_password: ''
  })
  const [passwordError,   setPasswordError]   = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [savingPassword,  setSavingPassword]  = useState(false)
  const [shifts, setShifts] = useState([])
  const [loadingShifts, setLoadingShifts] = useState(true)
  const [shiftModal, setShiftModal] = useState(null)       // null | 'new' | shift object
  const [employeesModal, setEmployeesModal] = useState(null) // null | shift object
  const [deletingShift, setDeletingShift] = useState(null)
  const [shiftError, setShiftError] = useState('')

  const fetchShifts = () => {
    api.get('/manager/shifts')
      .then(r => { if (r.data.success) setShifts(r.data.data) })
      .catch(() => {})
      .finally(() => setLoadingShifts(false))
  }

  useEffect(() => { fetchShifts() }, [])

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value })
    setPasswordError('')
  }

  const handlePasswordSave = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      setPasswordError('Please fill in all password fields'); return
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match'); return
    }
    if (passwordData.new_password.length < 6) {
      setPasswordError('Password must be at least 6 characters'); return
    }
    try {
      setSavingPassword(true)
      await api.put('/manager/self/change-password', {
        current_password: passwordData.current_password,
        new_password:     passwordData.new_password,
      })
      setPasswordSuccess(true)
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password')
    } finally { setSavingPassword(false) }
  }

  const handleDeleteShift = async (shift) => {
    if (!window.confirm(`Delete "${shift.name}"? This cannot be undone.`)) return
    setDeletingShift(shift.id)
    setShiftError('')
    try {
      await api.delete(`/manager/shifts/${shift.id}`)
      fetchShifts()
    } catch (err) {
      setShiftError(err.response?.data?.message || 'Failed to delete shift.')
    } finally { setDeletingShift(null) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Settings</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Manage account and company settings</p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-display text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">
          Account Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="font-display block text-xs text-gray-400 font-medium mb-1">Full Name</label>
            <p className="font-display text-sm font-semibold text-gray-800">{user?.first_name} {user?.last_name}</p>
          </div>
          <div>
            <label className="font-display block text-xs text-gray-400 font-medium mb-1">Email</label>
            <p className="font-body text-sm text-gray-600">{user?.email}</p>
          </div>
          <div>
            <span className="font-display inline-block bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
              Manager
            </span>
          </div>
        </div>
      </div>

      {/* Work Shifts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-base font-semibold text-gray-800">Work Shifts</h2>
          <button onClick={() => setShiftModal('new')}
            className="font-display text-xs bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition">
            + Add Shift
          </button>
        </div>
        <p className="font-body text-xs text-gray-400 mb-5 pb-3 border-b border-gray-100">
          Create and manage work shifts. Assign employees to shifts to enable shift-aware attendance tracking.
        </p>
        {shiftError && <p className="font-body text-xs text-red-500 mb-3">{shiftError}</p>}

        {loadingShifts ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading shifts...
          </div>
        ) : (
          // Horizontally scrollable shift cards
          <div className="flex gap-5 overflow-x-auto pb-3 -mx-1 px-1">
            {shifts.map(shift => (
              <div key={shift.id}
                className={`flex-shrink-0 w-96 rounded-2xl border p-6 flex flex-col gap-4 transition
                  ${shift.is_default ? 'border-primary/30 bg-amber-50/40' : 'border-gray-100 bg-gray-50'}`}>

                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-sm font-bold text-gray-800">{shift.name}</p>
                      {shift.is_default && (
                        <span className="font-display text-xs bg-primary text-white px-2 py-0.5 rounded-full">Default</span>
                      )}
                      {shift.is_overnight && (
                        <span className="font-display text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">Overnight</span>
                      )}
                    </div>
                    <p className="font-body text-xs text-gray-400 mt-0.5">{shift.shift_code}</p>
                  </div>
                  <span className="font-display text-xs font-semibold bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg">
                    {shift.employee_count || 0} emp
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-display text-sm font-semibold text-gray-700">
                    {fmt24(shift.start_time)} – {fmt24(shift.end_time)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                    <span key={d} className={`font-display text-xs px-2 py-0.5 rounded-md font-medium
                      ${shift.work_days?.includes(d) ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-300'}`}>
                      {d}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <p className="font-body text-gray-400">Late after</p>
                    <p className="font-display font-semibold text-gray-700">{shift.late_threshold_mins}m</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <p className="font-body text-gray-400">Half day</p>
                    <p className="font-display font-semibold text-gray-700">{shift.half_day_threshold_mins}m</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <button onClick={() => setEmployeesModal(shift)}
                    className="font-display flex-1 text-xs text-primary hover:bg-primary/5 border border-primary/20 py-1.5 rounded-lg font-semibold transition">
                    Manage Employees
                  </button>
                  <button onClick={() => setShiftModal(shift)}
                    className="font-display text-xs text-gray-500 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition">
                    Edit
                  </button>
                  {!shift.is_default && (
                    <button onClick={() => handleDeleteShift(shift)}
                      disabled={deletingShift === shift.id}
                      className="font-display text-xs text-red-400 hover:bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                      {deletingShift === shift.id ? '...' : 'Del'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {shifts.length === 0 && (
              <p className="font-body text-sm text-gray-400 py-4">No shifts yet. Click "+ Add Shift" to create one.</p>
            )}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-display text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">
          Change Password
        </h2>
        {passwordError   && <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{passwordError}</div>}
        {passwordSuccess && <div className="font-body bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3 mb-4">Password changed successfully!</div>}
        <div className="space-y-4 max-w-md">
          {[
            ['current_password', 'Current Password'],
            ['new_password',     'New Password'],
            ['confirm_password', 'Confirm New Password'],
          ].map(([name, label]) => (
            <div key={name}>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type="password" name={name} value={passwordData[name]} onChange={handlePasswordChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          ))}
          <button onClick={handlePasswordSave} disabled={savingPassword}
            className="font-display bg-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>

      {shiftModal && (
        <ShiftModal
          shift={shiftModal === 'new' ? null : shiftModal}
          onClose={() => setShiftModal(null)}
          onSaved={fetchShifts}
        />
      )}

      {employeesModal && (
        <ShiftEmployeesModal
          shift={employeesModal}
          onClose={() => setEmployeesModal(null)}
          onSaved={fetchShifts}
        />
      )}
    </div>
  )
}

export default ManagerSettings