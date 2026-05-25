import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

function SuperAdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setIsLoading(true)

    try {
      const response = await api.post('/auth/sa-login', { email, password })
      const { token, user } = response.data.data
      login(user, token)
      navigate('/superadmin/dashboard')
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
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
          <div className="flex justify-center mb-4">
            <img
              src="/shnoor-logo.png"
              alt="SHNOOR"
              className="h-16 w-auto object-contain cursor-pointer hover:opacity-80 transition"
              onClick={() => navigate('/')}
            />
          </div>
          <h1
            className="font-display text-2xl font-bold text-gray-800 cursor-pointer hover:text-primary transition"
            onClick={() => navigate('/')}
          >
            SHNOOR HRMS
          </h1>
          <p className="font-body text-gray-500 text-sm mt-1">Login to your account</p>
        </div>

        {error && (
          <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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

          <div className="flex justify-end mt-1 mb-4">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="font-display text-sm text-primary hover:underline font-medium"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="font-display w-full bg-primary hover:opacity-90 disabled:opacity-50 text-quaternary font-semibold py-2.5 rounded-lg transition text-sm"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="font-body text-sm text-gray-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-primary font-semibold hover:underline"
            >
              Get Started Free
            </button>
          </p>
        </div>

        <p className="font-body text-center text-xs text-gray-400 mt-4">
          By signing in you agree to our{' '}
          <a href="/terms" className="text-primary hover:underline">Terms & Conditions</a>
          {' '}and{' '}
          <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>
        </p>

        <p className="font-body text-center text-xs text-gray-400 mt-8">
          © 2026 SHNOOR International LLC. All rights reserved.
        </p>

      </div>
    </div>
  )
}

export default SuperAdminLoginPage