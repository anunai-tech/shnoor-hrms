import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

function LoginPage() {

  // State Variables 
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  //  Hooks 
  const { login } = useAuth()
  const navigate = useNavigate()

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setIsLoading(true)

    try {
      // API call to backend
      const response = await api.post('/auth/login', { email, password })

      const { token, user } = response.data.data

      // Save to AuthContext + localStorage
      login(user, token)

      // Redirect based on role
      if (user.role === 'superadmin') {
        navigate('/superadmin/dashboard')
      } else if (user.role === 'manager') {
        navigate('/manager/dashboard')
      } else if (user.role === 'employee') {
        navigate('/employee/dashboard')
      }

    } catch (err) {
      // Show error message from backend or generic message
      const message = err.response?.data?.message || 'Login failed. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  // UI 
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">

      {/* Login Card */}
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        {/* Logo Section */}
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
            className="text-2xl font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition"
            onClick={() => navigate('/')}
          >
            SHNOOR HRMS
          </h1>
          <p className="text-gray-500 text-sm mt-1">Login to your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              {/* Show/Hide Password Toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {/* Forgot Password Link */}
          <div className="flex justify-end mt-1 mb-4">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-white font-semibold py-2.5 rounded-lg transition text-sm"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

        </form>

        {/* Legal Links */}
        <p className="text-center text-xs text-gray-400 mt-4">
          By signing in you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:underline">Terms & Conditions</a>
          {' '}and{' '}
          <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>
        </p>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          © 2026 SHNOOR International LLC. All rights reserved.
        </p>

      </div>
    </div>
  )
}

export default LoginPage