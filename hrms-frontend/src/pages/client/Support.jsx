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
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="font-body text-sm text-gray-600">support@shnoor.com</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span className="font-body text-sm text-gray-600">+91 98765 43210</span>
              </div>
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