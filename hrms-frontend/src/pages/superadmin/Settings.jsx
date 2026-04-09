import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { changePassword } from '../../services/superadminService'

function Settings() {
  const { user } = useAuth()
  const [passwordData, setPasswordData] = useState({
    current_password: '', new_password: '', confirm_password: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

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
      setSaving(true)
      await changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      })
      setPasswordSuccess(true)
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your account settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">Account Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1">Full Name</label>
            <p className="text-sm font-semibold text-gray-800">{user?.first_name} {user?.last_name}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1">Email</label>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1">Role</label>
            <span className="inline-block bg-yellow-50 text-yellow-600 text-xs font-semibold px-3 py-1 rounded-full">
              Super Admin
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">Change Password</h2>

        {passwordError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{passwordError}</div>
        )}
        {passwordSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3 mb-4">Password changed successfully!</div>
        )}

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" name="current_password" value={passwordData.current_password}
              onChange={handlePasswordChange} placeholder="Enter current password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" name="new_password" value={passwordData.new_password}
              onChange={handlePasswordChange} placeholder="Enter new password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input type="password" name="confirm_password" value={passwordData.confirm_password}
              onChange={handlePasswordChange} placeholder="Re-enter new password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <button onClick={handlePasswordSave} disabled={saving}
            className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">System Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1">Version</label>
            <p className="text-sm font-semibold text-gray-800">SHNOOR HRMS v1.0</p>
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1">Support</label>
            <p className="text-sm text-gray-600">support@shnoor.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings