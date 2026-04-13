import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSuperAdminProfile, updateSuperAdminProfile } from '../../services/superadminService'

function SuperAdminProfile() {
  const { user, setUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', phone: '', address: ''
  })

  useEffect(() => {
    getSuperAdminProfile()
      .then(res => {
        const d = res.data.data
        setFormData({
          first_name: d.first_name || '',
          last_name: d.last_name || '',
          phone: d.phone || '',
          address: d.address || '',
        })
        if (d?.profile_photo) setProfilePhoto(d.profile_photo)
      })
      .catch(err => console.error(err))
  }, [])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => setProfilePhoto(event.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await updateSuperAdminProfile({ ...formData, profile_photo: profilePhoto })
      setUser({ ...user, ...res.data.data })
      setIsEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your personal information</p>
        </div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)}
            className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setIsEditing(false)}
              className="border border-gray-200 text-gray-600 text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3">
          Profile updated successfully!
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-100">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-yellow-100 flex items-center justify-center">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-yellow-600 font-black text-4xl">
                  {formData.first_name?.charAt(0) || 'A'}
                </span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center cursor-pointer hover:bg-yellow-500 transition">
              <span className="text-white text-xs font-bold">+</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{formData.first_name} {formData.last_name}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <span className="inline-block mt-2 bg-yellow-50 text-yellow-600 text-xs font-semibold px-3 py-1 rounded-full">
              Super Admin
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            {isEditing ? (
              <input name="first_name" value={formData.first_name} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            ) : <p className="text-sm text-gray-700">{formData.first_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            {isEditing ? (
              <input name="last_name" value={formData.last_name} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            ) : <p className="text-sm text-gray-700">{formData.last_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-sm text-gray-400">{user?.email} <span className="text-xs">(cannot change)</span></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            {isEditing ? (
              <input name="phone" value={formData.phone} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            ) : <p className="text-sm text-gray-700">{formData.phone || '—'}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <p className="text-sm text-gray-400">Super Admin <span className="text-xs">(cannot change)</span></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            {isEditing ? (
              <input name="address" value={formData.address} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            ) : <p className="text-sm text-gray-700">{formData.address || '—'}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminProfile