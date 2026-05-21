import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'

function Settings() {
  const [branding, setBranding] = useState({ display_name: '', tagline: '', logo_url: '', primary_color: '#D97706' })
  const [subdomainReq, setSubdomainReq] = useState(null)
  const [currentSubdomain, setCurrentSubdomain] = useState(null)
  const [newSubdomain, setNewSubdomain] = useState('')
  const [showSubdomainForm, setShowSubdomainForm] = useState(false)
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [loading, setLoading] = useState(true)
  const [brandingSaving, setBrandingSaving] = useState(false)
  const [subdomainSaving, setSubdomainSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [messages, setMessages] = useState({})
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api.get('/client/branding'),
      api.get('/client/subdomain-request')
    ]).then(([brandRes, subRes]) => {
      if (brandRes.data.data) setBranding(brandRes.data.data)
      setSubdomainReq(subRes.data.data.request)
      setCurrentSubdomain(subRes.data.data.currentSubdomain)
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const showMsg = (key, msg, isError = false) => {
    setMessages(prev => ({ ...prev, [key]: { text: msg, error: isError } }))
    setTimeout(() => setMessages(prev => ({ ...prev, [key]: null })), 4000)
  }

  // logo file handler — converts to base64
  const handleLogoFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showMsg('branding', 'Please upload a valid image file', true)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setBranding(prev => ({ ...prev, logo_url: e.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleLogoFile(file)
  }

  const saveBranding = async () => {
    setBrandingSaving(true)
    try {
      await api.put('/client/branding', branding)
      showMsg('branding', 'Branding updated successfully')
    } catch (err) {
      showMsg('branding', err.response?.data?.message || 'Failed to update branding', true)
    } finally {
      setBrandingSaving(false)
    }
  }

  const requestSubdomain = async () => {
    if (!newSubdomain.trim()) return
    setSubdomainSaving(true)
    try {
      await api.post('/client/subdomain-request', { requested_subdomain: newSubdomain.toLowerCase() })
      showMsg('subdomain', 'Subdomain request submitted. Awaiting approval.')
      setSubdomainReq({ status: 'pending', requested_subdomain: newSubdomain.toLowerCase() })
      setNewSubdomain('')
      setShowSubdomainForm(false)
    } catch (err) {
      showMsg('subdomain', err.response?.data?.message || 'Failed to submit request', true)
    } finally {
      setSubdomainSaving(false)
    }
  }

  const updatePassword = async () => {
    setPasswordSaving(true)
    try {
      await api.put('/client/password', passwords)
      showMsg('password', 'Password updated successfully')
      setPasswords({ current_password: '', new_password: '' })
    } catch (err) {
      showMsg('password', err.response?.data?.message || 'Failed to update password', true)
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="font-body text-gray-400 text-sm">Loading settings...</p>
    </div>
  )

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  }

  const canRequestSubdomain = !subdomainReq || subdomainReq.status === 'rejected'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Settings</h1>
        <p className="font-body text-sm text-gray-500 mt-1">Configure your company portal and account</p>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-display text-base font-semibold text-gray-800">Company Branding</h2>
        <p className="font-body text-sm text-gray-500">Appears on your company's portal landing and login page.</p>

        {/* Logo Upload */}
        <div>
          <label className="font-display block text-sm font-medium text-gray-700 mb-2">Company Logo</label>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
              ${isDragging ? 'border-primary bg-amber-50' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}`}
          >
            {branding.logo_url ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={branding.logo_url}
                  alt="Company logo"
                  className="h-16 w-auto object-contain rounded"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <p className="font-body text-xs text-gray-400">Click or drag to replace</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="font-display text-sm font-medium text-gray-600">Drop logo here or click to upload</p>
                <p className="font-body text-xs text-gray-400">PNG, JPG, SVG recommended</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleLogoFile(e.target.files[0])}
            />
          </div>

          {/* URL paste option */}
          <div className="mt-3">
            <label className="font-body text-xs text-gray-500 mb-1 block">Or paste image URL</label>
            <input
              type="url"
              value={branding.logo_url?.startsWith('data:') ? '' : (branding.logo_url || '')}
              onChange={e => setBranding(prev => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://yourcompany.com/logo.png"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input type="text" value={branding.display_name || ''}
              onChange={e => setBranding(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="Acme Corp"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition" />
          </div>
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Tagline</label>
            <input type="text" value={branding.tagline || ''}
              onChange={e => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
              placeholder="Empowering our people"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition" />
          </div>
        </div>

        {/* Brand Color — hex input + swatch */}
        <div>
          <label className="font-display block text-sm font-medium text-gray-700 mb-2">Brand Color</label>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border border-gray-200 flex-shrink-0 shadow-sm"
              style={{ backgroundColor: branding.primary_color || '#D97706' }}
            />
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display text-sm text-gray-400 font-medium">#</span>
              <input
                type="text"
                value={(branding.primary_color || '#D97706').replace('#', '')}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
                  setBranding(prev => ({ ...prev, primary_color: `#${val}` }))
                }}
                placeholder="D97706"
                maxLength={6}
                className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
              />
            </div>
            {/* hidden color picker as secondary option */}
            <input
              type="color"
              value={branding.primary_color || '#D97706'}
              onChange={e => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              title="Pick a color"
            />
          </div>
          <p className="font-body text-xs text-gray-400 mt-1.5">This color applies to your company's landing and login page.</p>
        </div>

        {messages.branding && (
          <p className={`font-body text-sm ${messages.branding.error ? 'text-red-600' : 'text-green-600'}`}>
            {messages.branding.text}
          </p>
        )}

        <button onClick={saveBranding} disabled={brandingSaving}
          className="font-display bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
          {brandingSaving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>

      {/* Subdomain */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-display text-base font-semibold text-gray-800">Company Subdomain</h2>

        {/* Active subdomain */}
        {currentSubdomain && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-sm font-semibold text-green-800">Portal Active</p>
              <p className="font-body text-sm text-green-700 mt-0.5">
                <span className="font-semibold">{currentSubdomain}.shnoor.com</span>
              </p>
            </div>
            {!showSubdomainForm && !subdomainReq?.status === 'pending' && (
              <button
                onClick={() => setShowSubdomainForm(true)}
                className="font-display text-xs font-medium text-green-700 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-100 transition flex-shrink-0"
              >
                Edit Subdomain
              </button>
            )}
          </div>
        )}

        {/* Current request status */}
        {subdomainReq && subdomainReq.status !== 'rejected' && (
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg space-y-2">
            <div className="flex items-center gap-3">
              <span className={`font-body text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[subdomainReq.status]}`}>
                {subdomainReq.status}
              </span>
              <span className="font-body text-sm text-gray-600">{subdomainReq.requested_subdomain}.shnoor.com</span>
            </div>
            {subdomainReq.status === 'pending' && (
              <p className="font-body text-xs text-gray-400">Your request is under review by the SHNOOR team.</p>
            )}
          </div>
        )}

        {/* Rejected — show reason + re-apply */}
        {subdomainReq?.status === 'rejected' && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-body text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Rejected</span>
              <span className="font-body text-sm text-gray-600">{subdomainReq.requested_subdomain}.shnoor.com</span>
            </div>
            {subdomainReq.rejection_reason && (
              <p className="font-body text-sm text-red-600">
                <span className="font-semibold">Reason:</span> {subdomainReq.rejection_reason}
              </p>
            )}
            {!showSubdomainForm && (
              <button
                onClick={() => setShowSubdomainForm(true)}
                className="font-display text-sm bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
              >
                Re-apply for Subdomain
              </button>
            )}
          </div>
        )}

        {/* Subdomain request form */}
        {(showSubdomainForm || (!currentSubdomain && canRequestSubdomain && !subdomainReq)) && (
          <div className="space-y-3">
            {!currentSubdomain && !subdomainReq && (
              <p className="font-body text-sm text-gray-500">
                Request a subdomain for your company portal. Example: <span className="font-semibold">yourcompany.shnoor.com</span>
              </p>
            )}
            {currentSubdomain && showSubdomainForm && (
              <p className="font-body text-sm text-gray-500">
                Request a new subdomain. Your current portal <span className="font-semibold">{currentSubdomain}.shnoor.com</span> will stay active until approved.
              </p>
            )}
            <div className="flex gap-2">
              <div className="flex-1 flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-yellow-400 transition">
                <input
                  type="text"
                  value={newSubdomain}
                  onChange={e => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="yourcompany"
                  className="flex-1 px-4 py-2.5 text-sm focus:outline-none"
                />
                <span className="font-body text-sm text-gray-400 pr-4 bg-white">.shnoor.com</span>
              </div>
              <button
                onClick={requestSubdomain}
                disabled={subdomainSaving || !newSubdomain.trim()}
                className="font-display bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
              >
                {subdomainSaving ? 'Requesting...' : 'Request'}
              </button>
              {showSubdomainForm && (
                <button
                  onClick={() => { setShowSubdomainForm(false); setNewSubdomain('') }}
                  className="font-display border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Edit subdomain button when active and no form showing */}
        {currentSubdomain && !showSubdomainForm && subdomainReq?.status !== 'pending' && (
          <button
            onClick={() => setShowSubdomainForm(true)}
            className="font-display text-sm text-primary hover:underline font-medium"
          >
            + Request different subdomain
          </button>
        )}

        {messages.subdomain && (
          <p className={`font-body text-sm ${messages.subdomain.error ? 'text-red-600' : 'text-green-600'}`}>
            {messages.subdomain.text}
          </p>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-display text-base font-semibold text-gray-800">Change Password</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" value={passwords.current_password}
              onChange={e => setPasswords(prev => ({ ...prev, current_password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition" />
          </div>
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" value={passwords.new_password}
              onChange={e => setPasswords(prev => ({ ...prev, new_password: e.target.value }))}
              placeholder="Min. 8 characters"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition" />
          </div>
        </div>
        {messages.password && (
          <p className={`font-body text-sm ${messages.password.error ? 'text-red-600' : 'text-green-600'}`}>
            {messages.password.text}
          </p>
        )}
        <button onClick={updatePassword} disabled={passwordSaving}
          className="font-display bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
          {passwordSaving ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}

export default Settings