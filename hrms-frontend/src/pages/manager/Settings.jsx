import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

function ManagerSettings() {
  const { user } = useAuth()
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

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
      setSaving(true)
      await api.put('/manager/self/change-password', {
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
            <span className="inline-block bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full">Manager</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">Change Password</h2>
        {passwordError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{passwordError}</div>}
        {passwordSuccess && <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3 mb-4">Password changed successfully!</div>}
        <div className="space-y-4 max-w-md">
          {[['current_password','Current Password'],['new_password','New Password'],['confirm_password','Confirm New Password']].map(([name, label]) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type="password" name={name} value={passwordData[name]} onChange={handlePasswordChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          ))}
          <button onClick={handlePasswordSave} disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ManagerSettings