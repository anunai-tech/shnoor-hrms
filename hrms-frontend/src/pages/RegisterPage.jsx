// RegisterPage — two-step signup:
//   Step 1: fill the registration form
//   Step 2: verify the email address with a 6-digit OTP before the account is created

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

// ─── OTP step ─────────────────────────────────────────────────────────────────

function OtpStep({ email, onVerified, onBack }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(60)
  const inputRefs = useRef([])
  const timerRef = useRef(null)

  // Start cooldown timer on mount (OTP was sent just before this step was shown)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

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
      await api.post('/auth/verify-email-otp', { email, otp: code })
      onVerified(code)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP. Try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }

  const resendOtp = async () => {
    setResending(true)
    setError('')
    try {
      await api.post('/auth/send-email-otp', { email })
      setCooldown(60)
      clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        <div className="mb-6">
          <button
            onClick={onBack}
            className="font-body flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Change email
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Verify your email</h1>
          <p className="font-body text-gray-500 text-sm mt-2">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-gray-700">{email}</span>
          </p>
          <p className="font-body text-gray-400 text-xs mt-1">
            Check your spam folder if you don't see it.
          </p>
        </div>

        {error && (
          <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-center mb-8" onPaste={handlePaste}>
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
              className="w-12 h-13 border-2 border-gray-200 rounded-xl text-center text-xl font-bold text-gray-800 focus:outline-none focus:border-yellow-400 transition py-3"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={verifying || otp.join('').length < 6}
          className="font-display w-full bg-primary hover:opacity-90 disabled:opacity-50 text-quaternary font-semibold py-2.5 rounded-lg transition text-sm mb-4"
        >
          {verifying ? 'Verifying…' : 'Verify & Create Account'}
        </button>

        <p className="font-body text-center text-sm text-gray-500">
          Didn't receive the code?{' '}
          {cooldown > 0 ? (
            <span className="text-gray-400">Resend in {cooldown}s</span>
          ) : (
            <button
              onClick={resendOtp}
              disabled={resending}
              className="text-primary font-semibold hover:underline disabled:opacity-50"
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </p>
      </div>
    </div>
  )
}

// ─── Main RegisterPage ─────────────────────────────────────────────────────────

function RegisterPage() {
  const [step, setStep] = useState('form') // 'form' | 'otp'
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    password: '',
    phone: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Step 1 — validate form then send OTP to the email
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    try {
      // Ask the backend to send an OTP to the supplied email
      await api.post('/auth/send-email-otp', { email: form.email })
      setStep('otp')
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('configured')) {
        setError('Email service is not configured yet. Please contact the administrator.')
      } else {
        setError(msg || 'Failed to send verification code. Try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2 — OTP verified; now actually create the account
  const handleOtpVerified = async (otpCode) => {
    setIsLoading(true)
    setError('')
    try {
      const response = await api.post('/auth/register', { ...form, otp: otpCode })
      const { token, user } = response.data.data
      login(user, token)
      navigate('/client/dashboard')
    } catch (err) {
      // Drop back to form so user can retry
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
      setStep('form')
    } finally {
      setIsLoading(false)
    }
  }

  // OTP step renders its own full-page layout
  if (step === 'otp') {
    return (
      <OtpStep
        email={form.email}
        onVerified={handleOtpVerified}
        onBack={() => setStep('form')}
      />
    )
  }

  // ── Step 1: Registration form ──
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="font-body flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
        </div>

        <div className="text-center mb-8">
          <img
            src="/shnoor-logo.png"
            alt="SHNOOR"
            className="h-14 w-auto object-contain mx-auto mb-3 cursor-pointer hover:opacity-80 transition"
            onClick={() => navigate('/')}
          />
          <h1 className="font-display text-2xl font-bold text-gray-800">Create your account</h1>
          <p className="font-body text-gray-500 text-sm mt-1">Start managing your team with SHNOOR HRMS</p>
        </div>

        {error && (
          <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              placeholder="Acme Corp"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">
              Your Full Name
            </label>
            <input
              type="text"
              name="contact_name"
              value={form.contact_name}
              onChange={handleChange}
              placeholder="John Doe"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">
              Work Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@company.com"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="font-display absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="font-display w-full bg-primary hover:opacity-90 disabled:opacity-50 text-quaternary font-semibold py-2.5 rounded-lg transition text-sm mt-2"
          >
            {isLoading ? 'Sending verification code…' : 'Continue'}
          </button>
        </form>

        <p className="font-body text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-primary font-semibold hover:underline"
          >
            Login
          </button>
        </p>

        <p className="font-body text-center text-xs text-gray-400 mt-4">
          By registering you agree to our{' '}
          <a href="/terms" className="text-primary hover:underline">Terms & Conditions</a>
          {' '}and{' '}
          <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage