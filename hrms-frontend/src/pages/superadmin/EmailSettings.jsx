import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-yellow-400' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="font-body text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

const INPUT =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition font-body'

// ─── OTP modal ────────────────────────────────────────────────────────────────

function OtpModal({ email, onVerified, onClose }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    sendOtp()
    return () => clearInterval(timerRef.current)
  }, [])

  const startCooldown = () => {
    setCooldown(60)
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const sendOtp = async () => {
    setSending(true)
    setError('')
    try {
      await api.post('/superadmin/email-settings/send-otp', { email })
      setSent(true)
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setSending(false)
    }
  }

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    setError('')
    if (val && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) { setError('Enter the 6-digit code'); return }
    setVerifying(true)
    setError('')
    try {
      await api.post('/superadmin/email-settings/verify-otp', { email, otp: code })
      onVerified()
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-bold text-gray-800">Verify Sender Email</h3>
          <p className="font-body text-sm text-gray-500 mt-1">
            {sent
              ? <>A 6-digit code was sent to <span className="font-medium text-gray-700">{email}</span></>
              : 'Sending verification code…'}
          </p>
        </div>

        {error && (
          <div className="font-body bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2.5 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-11 h-12 border-2 border-gray-200 rounded-lg text-center text-lg font-bold text-gray-800 focus:outline-none focus:border-yellow-400 transition"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={verifying || otp.join('').length < 6}
          className="font-display w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm mb-3"
        >
          {verifying ? 'Verifying…' : 'Verify & Save'}
        </button>

        <div className="flex items-center justify-between">
          <button
            onClick={sendOtp}
            disabled={sending || cooldown > 0}
            className="font-body text-xs text-yellow-600 hover:underline disabled:opacity-40 disabled:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend code'}
          </button>
          <button onClick={onClose} className="font-body text-xs text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Test Email Modal ─────────────────────────────────────────────────────────

function TestEmailModal({ provider, onClose }) {
  const [to, setTo] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const handleSend = async () => {
    if (!to) return
    setSending(true)
    setResult(null)
    try {
      await api.post('/superadmin/email-settings/test', { to, provider })
      setResult({ success: true, message: `Test email sent to ${to} via ${provider.toUpperCase()}` })
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Failed to send test email' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-base font-semibold text-gray-800">Send Test Email</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <p className="font-body text-sm text-gray-500 mb-4">
          Send a test email using your <span className="font-medium text-gray-700 uppercase">{provider}</span> configuration to verify it's working.
        </p>
        <Field label="Recipient Email">
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="you@example.com"
            className={INPUT}
          />
        </Field>
        {result && (
          <div className={`font-body text-sm rounded-lg px-3 py-2.5 mt-4 ${result.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
            {result.message}
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button
            onClick={handleSend}
            disabled={sending || !to}
            className="font-display flex-1 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            {sending ? 'Sending…' : 'Send Test'}
          </button>
          <button onClick={onClose} className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Email Templates tab ──────────────────────────────────────────────────────

const DEFAULT_TEMPLATES = {
  payment_verified: {
    subject: 'Payment Verified — Your Subscription is Active',
    body: `Hi {{company_name}},

Your payment of ₹{{amount}} for the {{plan}} plan has been verified and your subscription is now active.

Plan: {{plan}}
Amount: ₹{{amount}}
Payment Reference: {{reference}}
Activated On: {{date}}

You can now log in and start using SHNOOR HRMS.

If you have any questions, reply to this email or contact our support team.

Regards,
SHNOOR HRMS Team`,
  },
  payment_rejected: {
    subject: 'Payment Not Verified — Action Required',
    body: `Hi {{company_name}},

We were unable to verify your payment of ₹{{amount}} for the {{plan}} plan.

Reason: {{rejection_reason}}

Payment Reference: {{reference}}
Submitted On: {{date}}

Please re-submit your payment or contact support if you believe this is an error.

Regards,
SHNOOR HRMS Team`,
  },
  client_created: {
    subject: 'Welcome to SHNOOR HRMS — Your Account is Ready',
    body: `Hi {{contact_name}},

Welcome to SHNOOR HRMS! Your client account has been created by our team.

Here are your login details:

Company: {{company_name}}
Email: {{email}}
Temporary Password: {{password}}

Login at: {{login_url}}

For security, please change your password after your first login.

If you have any questions or need help getting started, feel free to reach out to our support team.

Regards,
SHNOOR HRMS Team`,
  },
  signup_otp: {
    subject: 'Your SHNOOR HRMS Verification Code',
    body: `Hi there,

Your email verification code for SHNOOR HRMS is:

{{otp}}

This code expires in 10 minutes. Do not share this code with anyone.

If you did not request this, please ignore this email.

Regards,
SHNOOR HRMS Team`,
  },
}

const TEMPLATE_VARIABLES = {
  payment_verified: ['{{company_name}}', '{{amount}}', '{{plan}}', '{{reference}}', '{{date}}'],
  payment_rejected: ['{{company_name}}', '{{amount}}', '{{plan}}', '{{reference}}', '{{date}}', '{{rejection_reason}}'],
  client_created: ['{{contact_name}}', '{{company_name}}', '{{email}}', '{{password}}', '{{login_url}}'],
  signup_otp: ['{{otp}}'],
}

const SAMPLE_VALUES = {
  '{{company_name}}': 'Acme Corp',
  '{{contact_name}}': 'John Doe',
  '{{amount}}': '2,999',
  '{{plan}}': 'Pro',
  '{{reference}}': 'PAY-20250528-001',
  '{{date}}': '28 May 2025',
  '{{rejection_reason}}': 'Payment screenshot unclear',
  '{{email}}': 'john@acme.com',
  '{{password}}': 'Temp@1234',
  '{{login_url}}': 'https://app.shnoor.com/login',
  '{{otp}}': '482719',
}

const TEMPLATE_TABS = [
  { key: 'payment_verified', label: 'Payment Verified', dot: 'bg-green-400' },
  { key: 'payment_rejected', label: 'Payment Rejected', dot: 'bg-red-400' },
  { key: 'client_created', label: 'Client Welcome', dot: 'bg-blue-400' },
  { key: 'signup_otp', label: 'Signup OTP', dot: 'bg-purple-400' },
]

function EmailTemplates() {
  const [activeTemplate, setActiveTemplate] = useState('payment_verified')
  const [templates, setTemplates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [mode, setMode] = useState('edit') // 'edit' | 'preview'
  const bodyRef = useRef(null)

  useEffect(() => { fetchTemplates() }, [])

  const flash = (text, isError = false) => {
    setMsg({ text, error: isError })
    setTimeout(() => setMsg(null), 4000)
  }

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/superadmin/email-settings/templates')
      const data = res.data.data || {}
      // Merge fetched data with defaults so new templates always appear
      const merged = {}
      Object.keys(DEFAULT_TEMPLATES).forEach(key => {
        merged[key] = data[key] || { ...DEFAULT_TEMPLATES[key] }
      })
      setTemplates(merged)
    } catch {
      const defaults = {}
      Object.keys(DEFAULT_TEMPLATES).forEach(key => {
        defaults[key] = { ...DEFAULT_TEMPLATES[key] }
      })
      setTemplates(defaults)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setTemplates(prev => ({
      ...prev,
      [activeTemplate]: { ...prev[activeTemplate], [field]: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/superadmin/email-settings/templates', templates)
      flash('Templates saved successfully')
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to save templates', true)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setTemplates(prev => ({
      ...prev,
      [activeTemplate]: { ...DEFAULT_TEMPLATES[activeTemplate] },
    }))
  }

  const insertVariable = (variable) => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const current = templates[activeTemplate].body
    const updated = current.slice(0, start) + variable + current.slice(end)
    handleChange('body', updated)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  const renderPreview = (text) =>
    Object.entries(SAMPLE_VALUES).reduce(
      (acc, [key, val]) => acc.replaceAll(key, `<span class="font-semibold text-yellow-600">${val}</span>`),
      text
    )

  const current = templates?.[activeTemplate]

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <p className="font-body text-gray-400 text-sm">Loading templates…</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Template selector */}
      <div className="flex gap-2 flex-wrap">
        {TEMPLATE_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTemplate(t.key); setMode('edit') }}
            className={`font-display flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition ${
              activeTemplate === t.key
                ? 'border-gray-300 bg-white shadow-sm text-gray-800'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${t.dot}`} />
            {t.label}
          </button>
        ))}
      </div>

      {current && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">

          {/* Header row */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <p className="font-display text-base font-semibold text-gray-800">
              {TEMPLATE_TABS.find(t => t.key === activeTemplate)?.label} Email
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                {['edit', 'preview'].map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`font-display text-xs font-semibold px-3 py-1.5 rounded-md transition capitalize ${
                      mode === m ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <button
                onClick={handleReset}
                className="font-body text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>

          {mode === 'edit' ? (
            <>
              {/* Subject */}
              <Field label="Subject Line">
                <input
                  type="text"
                  value={current.subject}
                  onChange={e => handleChange('subject', e.target.value)}
                  className={INPUT}
                />
              </Field>

              {/* Variable chips */}
              <div>
                <p className="font-display text-xs font-medium text-gray-500 mb-2">
                  Click to insert variable
                </p>
                <div className="flex flex-wrap gap-2">
                  {(TEMPLATE_VARIABLES[activeTemplate] || []).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="font-mono text-xs bg-gray-50 hover:bg-yellow-50 border border-gray-200 hover:border-yellow-300 text-gray-600 hover:text-yellow-700 px-2.5 py-1 rounded-md transition"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <Field label="Email Body">
                <textarea
                  ref={bodyRef}
                  value={current.body}
                  onChange={e => handleChange('body', e.target.value)}
                  rows={14}
                  className={`${INPUT} resize-none font-mono text-xs`}
                />
              </Field>
            </>
          ) : (
            /* Preview panel */
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 space-y-1">
                <p className="font-body text-xs text-gray-400">
                  <span className="font-medium text-gray-500">Subject: </span>
                  <span dangerouslySetInnerHTML={{ __html: renderPreview(current.subject) }} />
                </p>
              </div>
              <div className="bg-white px-6 py-5">
                <pre
                  className="font-body text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderPreview(current.body) }}
                />
              </div>
              <div className="bg-gray-50 border-t border-gray-100 px-4 py-2">
                <p className="font-body text-xs text-gray-400">
                  Highlighted values are sample data — actual values are filled in at send time.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {msg && (
                <p className={`font-body text-sm ${msg.error ? 'text-red-500' : 'text-green-600'}`}>
                  {msg.text}
                </p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="font-display bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
            >
              {saving ? 'Saving…' : 'Save Templates'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main EmailSettings page ──────────────────────────────────────────────────

function EmailSettings() {
  const [activeTab, setActiveTab] = useState('smtp')

  const [smtp, setSmtp] = useState({
    host: '', port: '587', username: '', password: '',
    from_name: '', from_email: '', encryption: 'tls', is_active: false,
  })
  const [smtpLoading, setSmtpLoading] = useState(true)
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpMsg, setSmtpMsg] = useState(null)
  const [smtpHasPassword, setSmtpHasPassword] = useState(false)

  const [resend, setResend] = useState({
    api_key: '', from_name: '', from_email: '', is_active: false,
  })
  const [resendLoading, setResendLoading] = useState(true)
  const [resendSaving, setResendSaving] = useState(false)
  const [resendMsg, setResendMsg] = useState(null)
  const [resendHasKey, setResendHasKey] = useState(false)

  const [otpTarget, setOtpTarget] = useState(null)
  const [pendingSave, setPendingSave] = useState(null)
  const [testModal, setTestModal] = useState(null) // 'smtp' | 'resend' | null

  useEffect(() => {
    fetchSmtp()
    fetchResend()
  }, [])

  const flash = (setter, text, isError = false) => {
    setter({ text, error: isError })
    setTimeout(() => setter(null), 4000)
  }

  // ── SMTP ──
  const fetchSmtp = async () => {
    try {
      const res = await api.get('/superadmin/email-settings/smtp')
      const d = res.data.data
      if (d) {
        setSmtp({
          host: d.host || '',
          port: d.port || '587',
          username: d.username || '',
          password: '',
          from_name: d.from_name || '',
          from_email: d.from_email || '',
          encryption: d.encryption || 'tls',
          is_active: d.is_active || false,
        })
        setSmtpHasPassword(!!d.has_password)
      }
    } catch { }
    finally { setSmtpLoading(false) }
  }

  const handleSmtpChange = (field, val) =>
    setSmtp(prev => ({ ...prev, [field]: val }))

  const saveSmtp = async (skipOtp = false) => {
    if (!smtp.host || !smtp.username || !smtp.from_email) {
      flash(setSmtpMsg, 'Host, username and from-email are required', true)
      return
    }
    if (!skipOtp) {
      setPendingSave({ type: 'smtp', data: smtp })
      setOtpTarget('smtp')
      return
    }
    setSmtpSaving(true)
    try {
      await api.put('/superadmin/email-settings/smtp', smtp)
      setSmtpHasPassword(smtp.password ? true : smtpHasPassword)
      setSmtp(prev => ({ ...prev, password: '' }))
      flash(setSmtpMsg, 'SMTP settings saved successfully')
    } catch (err) {
      flash(setSmtpMsg, err.response?.data?.message || 'Failed to save SMTP settings', true)
    } finally {
      setSmtpSaving(false)
    }
  }

  // ── Resend ──
  const fetchResend = async () => {
    try {
      const res = await api.get('/superadmin/email-settings/resend')
      const d = res.data.data
      if (d) {
        setResend({
          api_key: '',
          from_name: d.from_name || '',
          from_email: d.from_email || '',
          is_active: d.is_active || false,
        })
        setResendHasKey(!!d.has_api_key)
      }
    } catch { }
    finally { setResendLoading(false) }
  }

  const handleResendChange = (field, val) =>
    setResend(prev => ({ ...prev, [field]: val }))

  const saveResend = async (skipOtp = false) => {
    if (!resend.from_email) {
      flash(setResendMsg, 'From-email is required', true)
      return
    }
    if (!resendHasKey && !resend.api_key) {
      flash(setResendMsg, 'API key is required', true)
      return
    }
    if (!skipOtp) {
      setPendingSave({ type: 'resend', data: resend })
      setOtpTarget('resend')
      return
    }
    setResendSaving(true)
    try {
      await api.put('/superadmin/email-settings/resend', resend)
      setResendHasKey(resend.api_key ? true : resendHasKey)
      setResend(prev => ({ ...prev, api_key: '' }))
      flash(setResendMsg, 'Resend settings saved successfully')
    } catch (err) {
      flash(setResendMsg, err.response?.data?.message || 'Failed to save Resend settings', true)
    } finally {
      setResendSaving(false)
    }
  }

  const handleOtpVerified = () => {
    setOtpTarget(null)
    if (pendingSave?.type === 'smtp') saveSmtp(true)
    if (pendingSave?.type === 'resend') saveResend(true)
    setPendingSave(null)
  }

  if (smtpLoading && resendLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-body text-gray-400 text-sm">Loading email settings…</p>
      </div>
    )
  }

  return (
    <>
      {otpTarget && pendingSave && (
        <OtpModal
          email={pendingSave.data.from_email}
          onVerified={handleOtpVerified}
          onClose={() => { setOtpTarget(null); setPendingSave(null) }}
        />
      )}

      {testModal && (
        <TestEmailModal
          provider={testModal}
          onClose={() => setTestModal(null)}
        />
      )}

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Email Settings</h1>
          <p className="font-body text-sm text-gray-400 mt-1">
            Configure your mail provider and customise notification templates
          </p>
        </div>

        {/* Tabs — overflow-x-hidden removes the scrollbar */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-hidden">
          {[
            { key: 'smtp', label: 'SMTP' },
            { key: 'resend', label: 'Resend' },
            { key: 'templates', label: 'Email Templates' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`font-display px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-yellow-400 text-yellow-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SMTP tab */}
        {activeTab === 'smtp' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <p className="font-display text-base font-semibold text-gray-800">SMTP Configuration</p>
                <p className="font-body text-xs text-gray-400 mt-0.5">Used to send all transactional emails via your own SMTP server</p>
              </div>
              <div className="flex items-center gap-3">
                {smtp.is_active && (
                  <span className="font-display text-xs font-semibold bg-green-50 text-green-600 px-2.5 py-1 rounded-full">
                    Active
                  </span>
                )}
                <Toggle checked={smtp.is_active} onChange={val => handleSmtpChange('is_active', val)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="SMTP Host">
                <input type="text" value={smtp.host}
                  onChange={e => handleSmtpChange('host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className={INPUT} />
              </Field>

              <Field label="Port">
                <select value={smtp.port}
                  onChange={e => handleSmtpChange('port', e.target.value)}
                  className={INPUT}>
                  <option value="25">25 (No encryption)</option>
                  <option value="465">465 (SSL)</option>
                  <option value="587">587 (TLS — recommended)</option>
                  <option value="2525">2525 (TLS alternative)</option>
                </select>
              </Field>

              <Field label="Encryption">
                <select value={smtp.encryption}
                  onChange={e => handleSmtpChange('encryption', e.target.value)}
                  className={INPUT}>
                  <option value="tls">TLS / STARTTLS</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </Field>

              <Field label="Username">
                <input type="text" value={smtp.username}
                  onChange={e => handleSmtpChange('username', e.target.value)}
                  placeholder="you@gmail.com"
                  className={INPUT} />
              </Field>

              <Field
                label="Password"
                hint={smtpHasPassword ? 'Password is saved. Enter a new value to replace it.' : undefined}
              >
                <input type="password" value={smtp.password}
                  onChange={e => handleSmtpChange('password', e.target.value)}
                  placeholder={smtpHasPassword ? 'Leave blank to keep existing password' : 'Enter SMTP password or app password'}
                  className={INPUT} />
              </Field>

              <Field label="From Name">
                <input type="text" value={smtp.from_name}
                  onChange={e => handleSmtpChange('from_name', e.target.value)}
                  placeholder="SHNOOR HRMS"
                  className={INPUT} />
              </Field>

              <Field label="From Email">
                <input type="email" value={smtp.from_email}
                  onChange={e => handleSmtpChange('from_email', e.target.value)}
                  placeholder="noreply@yourdomain.com"
                  className={INPUT} />
              </Field>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                {smtpMsg && (
                  <p className={`font-body text-sm ${smtpMsg.error ? 'text-red-500' : 'text-green-600'}`}>
                    {smtpMsg.text}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {smtpHasPassword && (
                  <button
                    onClick={() => setTestModal('smtp')}
                    className="font-display border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-4 py-2.5 rounded-lg transition"
                  >
                    Send Test Email
                  </button>
                )}
                <button
                  onClick={() => saveSmtp(false)}
                  disabled={smtpSaving}
                  className="font-display bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
                >
                  {smtpSaving ? 'Saving…' : 'Save SMTP Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resend tab */}
        {activeTab === 'resend' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <p className="font-display text-base font-semibold text-gray-800">Resend Configuration</p>
                <p className="font-body text-xs text-gray-400 mt-0.5">Use Resend.com API for reliable transactional email delivery</p>
              </div>
              <div className="flex items-center gap-3">
                {resend.is_active && (
                  <span className="font-display text-xs font-semibold bg-green-50 text-green-600 px-2.5 py-1 rounded-full">
                    Active
                  </span>
                )}
                <Toggle checked={resend.is_active} onChange={val => handleResendChange('is_active', val)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Resend API Key"
                hint={resendHasKey ? 'API key is saved. Enter a new value to replace it.' : undefined}
              >
                <input type="password" value={resend.api_key}
                  onChange={e => handleResendChange('api_key', e.target.value)}
                  placeholder={resendHasKey ? 'Leave blank to keep existing key' : 're_xxxxxxxxxxxxxxxxxxxxxxxx'}
                  className={INPUT} />
              </Field>

              <Field label="From Name">
                <input type="text" value={resend.from_name}
                  onChange={e => handleResendChange('from_name', e.target.value)}
                  placeholder="SHNOOR HRMS"
                  className={INPUT} />
              </Field>

              <Field label="From Email">
                <input type="email" value={resend.from_email}
                  onChange={e => handleResendChange('from_email', e.target.value)}
                  placeholder="noreply@yourdomain.com"
                  className={INPUT} />
              </Field>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                {resendMsg && (
                  <p className={`font-body text-sm ${resendMsg.error ? 'text-red-500' : 'text-green-600'}`}>
                    {resendMsg.text}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {resendHasKey && (
                  <button
                    onClick={() => setTestModal('resend')}
                    className="font-display border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-4 py-2.5 rounded-lg transition"
                  >
                    Send Test Email
                  </button>
                )}
                <button
                  onClick={() => saveResend(false)}
                  disabled={resendSaving}
                  className="font-display bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
                >
                  {resendSaving ? 'Saving…' : 'Save Resend Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Templates tab */}
        {activeTab === 'templates' && <EmailTemplates />}
      </div>
    </>
  )
}

export default EmailSettings