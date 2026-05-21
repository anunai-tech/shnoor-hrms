import { useState } from 'react'
import api from '../../services/api'

function Support() {
  const [form, setForm] = useState({ subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      setError('Please fill in both subject and message')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/client/support', form)
      setSuccess(true)
      setForm({ subject: '', message: '' })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Support</h1>
        <p className="font-body text-sm text-gray-500 mt-1">Get help from the SHNOOR team</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Contact Form */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-gray-800">Send a Message</h2>

          {success && (
            <div className="bg-green-50 border border-green-100 text-green-700 text-sm font-body rounded-lg px-4 py-3">
              Ticket submitted successfully. We'll get back to you within 24 hours.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-body rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="e.g. Issue with subdomain setup"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            />
          </div>

          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={form.message}
              onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Describe your issue or question in detail..."
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="font-display bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-display text-sm font-semibold text-gray-800 mb-3">Contact Info</h3>
            <div className="space-y-2">
              <p className="font-body text-sm text-gray-600">📧 support@shnoor.com</p>
              <p className="font-body text-sm text-gray-600">📞 +91 98765 43210</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-amber-800 mb-2">Response Time</h3>
            <p className="font-body text-sm text-amber-700">We typically respond within 24 business hours.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Support