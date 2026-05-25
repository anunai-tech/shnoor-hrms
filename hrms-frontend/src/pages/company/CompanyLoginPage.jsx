import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import useSubdomain from '../../hooks/useSubdomain'

function CompanyLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [branding, setBranding] = useState(null)

  const { login } = useAuth()
  const navigate = useNavigate()
  const { companySlug } = useSubdomain()

  useEffect(() => {
    if (!companySlug) return
    api.get(`/public/company-info/${companySlug}`)
      .then(res => setBranding(res.data.data))
      .catch(() => {})
  }, [companySlug])

  const displayName = branding?.display_name || branding?.name || companySlug
  const logoUrl = branding?.logo_url
  const primaryColor = branding?.primary_color || '#D97706'
  const isSuspended = branding?.status === 'suspended'

  // if no company context at all, redirect to main login
  if (!companySlug && !branding) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="font-display text-gray-800 font-semibold mb-2">No company portal specified</p>
          <p className="font-body text-sm text-gray-500 mb-4">
            Please access this page via your company portal URL.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="font-display text-sm bg-primary text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition"
          >
            Go to Main Login
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }
    setIsLoading(true)
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, user } = response.data.data

      if (user.role !== 'manager' && user.role !== 'employee') {
        setError('This portal is for company staff only. Please use the main portal.')
        return
      }

      try {
        const companyRes = await api.get(`/public/company-info/${companySlug}`)
        const portalCompanyId = companyRes.data.data?.id
        if (portalCompanyId && user.company_id !== portalCompanyId) {
          setError('Your account does not belong to this company portal.')
          return
        }
      } catch {
        setError('Unable to verify company access. Please try again.')
        return
      }

      login(user, token)
      navigate(user.role === 'manager' ? '/manager/dashboard' : '/employee/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-gray-900 flex flex-col"
      style={{ '--color-primary': primaryColor }}
    >
      {/* Suspension Banner */}
      {isSuspended && (
        <div className="w-full bg-orange-500 px-4 py-3 flex items-center justify-center gap-3 z-50">
          <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-display text-sm font-semibold text-white">
            This portal has been temporarily suspended. Staff login is currently unavailable.
          </p>
        </div>
      )}

      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: primaryColor }}
        />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 py-6">
        <button
          onClick={() => navigate(`/${window.location.search}`)}
          className="font-body flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={displayName}
              className="h-6 w-auto object-contain opacity-70"
              onError={e => { e.target.style.display = 'none' }} />
          ) : (
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="text-white font-display font-bold text-xs uppercase">{displayName?.[0]}</span>
            </div>
          )}
          <span className="font-display text-gray-500 text-sm capitalize">{displayName}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="bg-gray-800 bg-opacity-60 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">

            {/* Logo */}
            <div className="text-center mb-8">
              {logoUrl ? (
                <img src={logoUrl} alt={displayName}
                  className="h-14 w-auto object-contain mx-auto mb-4"
                  onError={e => { e.target.style.display = 'none' }} />
              ) : (
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-white font-display font-bold text-2xl uppercase">
                    {displayName?.[0]}
                  </span>
                </div>
              )}
              <h1 className="font-display text-xl font-bold text-white capitalize">{displayName}</h1>
              <p className="font-body text-gray-400 text-sm mt-1">Staff Portal Login</p>
            </div>

            {/* Suspended state */}
            {isSuspended ? (
              <div className="bg-orange-500 bg-opacity-10 border border-orange-500 border-opacity-30 rounded-xl px-5 py-5 text-center">
                <svg className="w-7 h-7 text-orange-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-display text-sm font-semibold text-orange-300 mb-1">Portal Suspended</p>
                <p className="font-body text-xs text-orange-400 opacity-80">
                  Staff login is currently unavailable. Please contact your company administrator.
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-950 border border-red-800 text-red-200 text-sm font-body rounded-xl px-4 py-3 mb-5">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="font-display block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-opacity-60 transition"
                      style={{ '--tw-ring-color': primaryColor }}
                      onFocus={e => e.target.style.borderColor = primaryColor + '80'}
                      onBlur={e => e.target.style.borderColor = ''}
                    />
                  </div>

                  <div>
                    <label className="font-display block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition"
                        onFocus={e => e.target.style.borderColor = primaryColor + '80'}
                        onBlur={e => e.target.style.borderColor = ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="font-display absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs font-medium transition"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate(`/forgot-password${window.location.search}`)}
                      className="font-display text-xs font-medium text-gray-500 hover:text-gray-300 transition"
                      style={{ color: primaryColor + 'cc' }}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="font-display w-full font-semibold py-3 rounded-xl transition text-sm text-white disabled:opacity-50 shadow-lg mt-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : 'Sign In'}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Footer */}
          <p className="font-body text-center text-xs text-gray-600 mt-6">
            Having trouble?{' '}
            <a href="mailto:support@shnoor.com" className="hover:text-gray-400 transition" style={{ color: primaryColor + 'aa' }}>
              Contact support
            </a>
          </p>
        </div>
      </div>

      {/* Bottom powered by */}
      <div className="relative z-10 text-center py-4 border-t border-gray-800">
        <p className="font-body text-xs text-gray-700">
          Powered by{' '}
          <a href="https://shnoor.com" target="_blank" rel="noreferrer"
            className="transition" style={{ color: primaryColor + '99' }}>
            SHNOOR HRMS
          </a>
        </p>
      </div>
    </div>
  )
}

export default CompanyLoginPage