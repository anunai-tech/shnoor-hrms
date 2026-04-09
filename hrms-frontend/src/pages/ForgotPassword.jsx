import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=email, 2=otp+newpass
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await axios.post('http://localhost:5000/api/v1/public/forgot-password', { email })
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await axios.post('http://localhost:5000/api/v1/public/reset-password', {
        email, otp, new_password: newPassword
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/shnoor-logo.png" alt="SHNOOR" className="h-12 w-auto object-contain" />
        </div>

        {success ? (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Password Reset!</h2>
            <p className="text-sm text-gray-400 mb-6">Your password has been updated successfully.</p>
            <button onClick={() => navigate('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition">
              Back to Login
            </button>
          </div>
        ) : step === 1 ? (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Forgot Password</h2>
            <p className="text-sm text-gray-400 mb-6">Enter your registered email to receive an OTP.</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl text-sm transition">
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-400 mt-6">
              Remember your password?{' '}
              <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline font-medium">
                Back to Login
              </button>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Enter OTP</h2>
            <p className="text-sm text-gray-400 mb-1">OTP sent to <span className="font-medium text-gray-600">{email}</span></p>
            <p className="text-xs text-gray-400 mb-6">Valid for 10 minutes. Check your inbox.</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
                <input type="text" value={otp} onChange={e => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP" maxLength={6} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest text-center text-lg font-bold" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters" required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password" required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl text-sm transition">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-400 mt-4">
              Didn't receive OTP?{' '}
              <button onClick={() => setStep(1)} className="text-blue-600 hover:underline font-medium">
                Try again
              </button>
            </p>
          </>
        )}

      </div>
    </div>
  )
}

export default ForgotPassword