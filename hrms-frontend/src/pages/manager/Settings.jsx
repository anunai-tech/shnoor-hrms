import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function ManagerSettings() {
  const { user } = useAuth()

  const [passwordData, setPasswordData] = useState({
    current_password: '', new_password: '', confirm_password: ''
  })
  const [passwordError,   setPasswordError]   = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [savingPassword,  setSavingPassword]  = useState(false)

  const [officeSettings, setOfficeSettings] = useState({
    work_start_time:         '09:00',
    work_end_time:           '18:00',
    late_threshold_mins:     15,
    half_day_threshold_mins: 240,
    work_days:               ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  })
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings,  setSavingSettings]  = useState(false)
  const [settingsError,   setSettingsError]   = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState(false)

  useEffect(() => {
    api.get('/manager/company-settings')
      .then(res => {
        if (res.data.success && res.data.data) {
          const d = res.data.data
          setOfficeSettings({
            work_start_time:         d.work_start_time         || '09:00',
            work_end_time:           d.work_end_time           || '18:00',
            late_threshold_mins:     d.late_threshold_mins     ?? 15,
            half_day_threshold_mins: d.half_day_threshold_mins ?? 240,
            work_days:               d.work_days               || ['Mon','Tue','Wed','Thu','Fri'],
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false))
  }, [])

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value })
    setPasswordError('')
  }

  const handlePasswordSave = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      setPasswordError('Please fill in all password fields')
      return
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match')
      return
    }
    if (passwordData.new_password.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
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
    } finally {
      setSavingPassword(false)
    }
  }

  const toggleWorkDay = (day) => {
    setOfficeSettings(prev => {
      const days = prev.work_days.includes(day)
        ? prev.work_days.filter(d => d !== day)
        : [...prev.work_days, day]
      return { ...prev, work_days: days }
    })
  }

  const handleSettingsSave = async () => {
    setSettingsError('')
    if (!officeSettings.work_start_time || !officeSettings.work_end_time) {
      setSettingsError('Work start and end times are required.')
      return
    }
    if (officeSettings.work_days.length === 0) {
      setSettingsError('Please select at least one working day.')
      return
    }
    try {
      setSavingSettings(true)
      await api.put('/manager/company-settings', officeSettings)
      setSettingsSuccess(true)
      setTimeout(() => setSettingsSuccess(false), 3000)
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Settings</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Manage account and company settings</p>
      </div>

      {/* Account info */}
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

      {/* Office timings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-display text-base font-semibold text-gray-800 mb-1 ">
          Office Timings
        </h2>
        <p className="font-body text-xs text-gray-400 mb-5 pb-3 border-b border-gray-100">
          Configure working hours, late threshold, and working days for your company.
          These settings affect automatic Late detection on clock-in.
        </p>

        {loadingSettings ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading settings...
          </div>
        ) : (
          <div className="space-y-6 max-w-lg">

            {/* Work hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-display block text-xs font-semibold text-gray-600 mb-1">
                  Work Start Time
                </label>
                <input
                  type="time"
                  value={officeSettings.work_start_time}
                  onChange={e => setOfficeSettings(p => ({ ...p, work_start_time: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="font-display block text-xs font-semibold text-gray-600 mb-1">
                  Work End Time
                </label>
                <input
                  type="time"
                  value={officeSettings.work_end_time}
                  onChange={e => setOfficeSettings(p => ({ ...p, work_end_time: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Thresholds */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-display block text-xs font-semibold text-gray-600 mb-1">
                  Late Threshold (minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={officeSettings.late_threshold_mins}
                  onChange={e => setOfficeSettings(p => ({ ...p, late_threshold_mins: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="font-body text-xs text-gray-400 mt-1">
                  Clocking in more than this many minutes after start time marks as Late.
                </p>
              </div>
              <div>
                <label className="font-display block text-xs font-semibold text-gray-600 mb-1">
                  Half Day Threshold (minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  value={officeSettings.half_day_threshold_mins}
                  onChange={e => setOfficeSettings(p => ({ ...p, half_day_threshold_mins: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="font-body text-xs text-gray-400 mt-1">
                  Working less than this many minutes counts as a half day.
                </p>
              </div>
            </div>

            {/* Working days */}
            <div>
              <label className="font-display block text-xs font-semibold text-gray-600 mb-2">
                Working Days
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map(day => {
                  const active = officeSettings.work_days.includes(day)
                  return (
                    <button
                      key={day}
                      onClick={() => toggleWorkDay(day)}
                      className={`font-display text-xs font-semibold px-3 py-1.5 rounded-lg border transition
                        ${active
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary'
                        }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
              <p className="font-body text-xs text-gray-400 mt-2">
                Non-selected days will appear as Weekend in the attendance calendar.
              </p>
            </div>

            {settingsError   && <p className="font-body text-xs text-red-500">{settingsError}</p>}
            {settingsSuccess && <p className="font-body text-xs text-green-600">Office settings saved successfully.</p>}

            <button
              onClick={handleSettingsSave}
              disabled={savingSettings}
              className="font-display bg-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
            >
              {savingSettings ? 'Saving...' : 'Save Office Settings'}
            </button>
          </div>
        )}
      </div>

      {/* Change password */}
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
              <input
                type="password"
                name={name}
                value={passwordData[name]}
                onChange={handlePasswordChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
          <button
            onClick={handlePasswordSave}
            disabled={savingPassword}
            className="font-display bg-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ManagerSettings