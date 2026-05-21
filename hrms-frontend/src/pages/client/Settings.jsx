import { useState, useEffect } from 'react'
import api from '../../services/api'

function Settings() {
  const [branding, setBranding] = useState({ display_name: '', tagline: '', logo_url: '', primary_color: '#D97706' })
  const [subdomainReq, setSubdomainReq] = useState(null)
  const [currentSubdomain, setCurrentSubdomain] = useState(null)
  const [newSubdomain, setNewSubdomain] = useState('')
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [loading, setLoading] = useState(true)
  const [brandingSaving, setBrandingSaving] = useState(false)
  const [subdomainSaving, setSubdomainSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [messages, setMessages] = useState({})

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Settings</h1>
        <p className="font-body text-sm text-gray-500 mt-1">Configure your company portal and account</p>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-display text-base font-semibold text-gray-800">Company Branding</h2>
        <p className="font-body text-sm text-gray-500">This appears on your company's portal landing page.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={branding.display_name || ''}
              onChange={e => setBranding(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="Acme Corp"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            />
          </div>
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Tagline</label>
            <input
              type="text"
              value={branding.tagline || ''}
              onChange={e => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
              placeholder="Empowering our people"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            />
          </div>
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="url"
              value={branding.logo_url || ''}
              onChange={e => setBranding(prev => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://yourcompany.com/logo.png"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            />
          </div>
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={branding.primary_color || '#D97706'}
                onChange={e => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                className="h-10 w-14 border border-gray-300 rounded-lg cursor-pointer"
              />
              <span className="font-body text-sm text-gray-500">{branding.primary_color}</span>
            </div>
          </div>
        </div>

        {messages.branding && (
          <p className={`font-body text-sm ${messages.branding.error ? 'text-red-600' : 'text-green-600'}`}>
            {messages.branding.text}
          </p>
        )}

        <button
          onClick={saveBranding}
          disabled={brandingSaving}
          className="font-display bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
        >
          {brandingSaving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>

      {/* Subdomain */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-display text-base font-semibold text-gray-800">Company Subdomain</h2>

        {currentSubdomain ? (
          <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
            <p className="font-body text-sm text-green-700">
              Your portal is live at:{' '}
              <span className="font-semibold">{currentSubdomain}.shnoor.com</span>
            </p>
          </div>
        ) : subdomainReq ? (
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg space-y-2">
            <div className="flex items-center gap-3">
              <span className={`font-body text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[subdomainReq.status]}`}>
                {subdomainReq.status}
              </span>
              <span className="font-body text-sm text-gray-600">{subdomainReq.requested_subdomain}.shnoor.com</span>
            </div>
            {subdomainReq.status === 'rejected' && subdomainReq.rejection_reason && (
              <p className="font-body text-sm text-red-600">Reason: {subdomainReq.rejection_reason}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-body text-sm text-gray-500">
              Request a subdomain for your company portal. Example: <span className="font-semibold">yourcompany.shnoor.com</span>
            </p>
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
            </div>
          </div>
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
            <input
              type="password"
              value={passwords.current_password}
              onChange={e => setPasswords(prev => ({ ...prev, current_password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            />
          </div>
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={passwords.new_password}
              onChange={e => setPasswords(prev => ({ ...prev, new_password: e.target.value }))}
              placeholder="Min. 8 characters"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            />
          </div>
        </div>

        {messages.password && (
          <p className={`font-body text-sm ${messages.password.error ? 'text-red-600' : 'text-green-600'}`}>
            {messages.password.text}
          </p>
        )}

        <button
          onClick={updatePassword}
          disabled={passwordSaving}
          className="font-display bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
        >
          {passwordSaving ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}

export default Settings