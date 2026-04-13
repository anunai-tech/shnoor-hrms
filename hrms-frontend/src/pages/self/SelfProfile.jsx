import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getManagerProfile, updateManagerProfile } from '../../services/managerService'
import api from '../../services/api'

function SelfProfile() {
  const { user, setUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({ first_name: '', last_name: '', phone: '', address: '', designation: '', department: '' })

  useEffect(() => {
    getManagerProfile()
      .then(res => {
        const d = res.data.data
        setFormData({ first_name: d.first_name || '', last_name: d.last_name || '', phone: d.phone || '', address: d.address || '', designation: d.designation || '', department: d.department || '' })
      })
      .catch(err => console.error(err))

    api.get('/profile-picture')
      .then(res => setAvatarUrl(res.data?.data?.url || null))
      .catch(() => setAvatarUrl(null))
  }, [])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadError('')
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setUploadError('Only JPEG, PNG, or WEBP images are allowed.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Image must be under 3MB.')
      return
    }

    const formPayload = new FormData()
    formPayload.append('profilePicture', file)

    try {
      setUploading(true)
      const res = await api.post('/profile-picture', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAvatarUrl(res.data.data.url)
    } catch (err) {
      setUploadError('Upload failed. Please try again.')
      console.error(err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    try {
      setUploading(true)
      await api.delete('/profile-picture')
      setAvatarUrl(null)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await updateManagerProfile(formData)
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
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setIsEditing(false)}
              className="border border-gray-200 text-gray-600 text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        )}
      </div>

      {saved && <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3">Profile updated successfully!</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-100">

          {/* Avatar with upload controls */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={`http://localhost:5000${avatarUrl}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-blue-600 font-black text-4xl">{formData.first_name?.charAt(0) || 'M'}</span>
                )}
              </div>
              <label className={`absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="text-white text-xs font-bold">{uploading ? '…' : '+'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            {avatarUrl && !uploading && (
              <button
                onClick={handleRemovePhoto}
                className="text-xs text-red-400 hover:text-red-600 transition"
              >
                Remove photo
              </button>
            )}
            {uploadError && (
              <p className="text-xs text-red-500 text-center max-w-[100px]">{uploadError}</p>
            )}
          </div>

          <div>
            <p className="text-xl font-bold text-gray-800">{formData.first_name} {formData.last_name}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <span className="inline-block mt-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full">Manager</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[['first_name','First Name'],['last_name','Last Name'],['phone','Phone'],['address','Address'],['designation','Designation'],['department','Department']].map(([name, label]) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              {isEditing ? (
                <input name={name} value={formData[name]} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              ) : (
                <p className="text-sm text-gray-700">{formData[name] || '—'}</p>
              )}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-sm text-gray-400">{user?.email} <span className="text-xs">(cannot change)</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SelfProfile
