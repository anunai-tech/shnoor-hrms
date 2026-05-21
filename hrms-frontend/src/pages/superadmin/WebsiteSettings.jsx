import { useState, useEffect } from 'react'
import { getWebsiteSettings, updateWebsiteSettings } from '../../services/superadminService'

function WebsiteSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    logo_url: '',
    hero_title: '',
    hero_subtitle: '',
    cta_button_text: '',
    cta_button_link: '',
    contact_email: '',
    contact_phone: '',
    footer_text: '',
  })

  useEffect(() => {
    getWebsiteSettings()
      .then(res => { if (res.data.data) setFormData(res.data.data) })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setSaved(false)
  }

  const [isDragging, setIsDragging] = useState(false)

  const handleLogoFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setFormData({ ...formData, logo_url: event.target.result })
      setSaved(false)
    }
    reader.readAsDataURL(file)
  }

  const handleLogoUpload = (e) => handleLogoFile(e.target.files[0])
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleLogoFile(e.dataTransfer.files[0])
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateWebsiteSettings(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="font-body text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-800">Website Settings</h1>
          <p className="font-body text-sm text-gray-400 mt-1">Customize the public landing page content</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="font-display w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}
      {saved && <div className="font-body bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3">Settings saved successfully!</div>}

      {/* Logo Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="font-display text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">Logo</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
          <div className="flex-shrink-0">
            <p className="font-display text-xs text-gray-400 font-medium mb-2">Current Logo</p>
            <div className="w-32 h-20 border border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo" className="h-14 w-auto object-contain" />
              ) : (
                <p className="font-body text-xs text-gray-400">No logo</p>
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-medium text-gray-700 mb-2">Upload New Logo</p>
            <p className="font-body text-xs text-gray-400 mb-4">Recommended: PNG with transparent background, min 200x200px</p>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('logo-upload').click()}
              className={`mt-2 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition
    ${isDragging ? 'border-primary bg-amber-50' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}`}
            >
              <p className="font-display text-sm font-medium text-gray-600">Drop logo here or click to upload</p>
              <p className="font-body text-xs text-gray-400 mt-1">PNG, JPG, SVG — max 2MB</p>
              <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="font-display text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">Hero Section</h2>
        <div className="space-y-5">
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
            <input name="hero_title" value={formData.hero_title || ''} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
            <textarea name="hero_subtitle" value={formData.hero_subtitle || ''} onChange={handleChange} rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="font-display text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">Call To Action Button</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Button Text</label>
            <input name="cta_button_text" value={formData.cta_button_text || ''} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Button Link</label>
            <input name="cta_button_link" value={formData.cta_button_link || ''} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="font-display text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">Contact Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
            <input name="contact_email" value={formData.contact_email || ''} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
            <input name="contact_phone" value={formData.contact_phone || ''} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="font-display text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">Footer</h2>
        <div>
          <label className="font-display block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
          <input name="footer_text" value={formData.footer_text || ''} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>
      </div>

    </div>
  )
}

export default WebsiteSettings