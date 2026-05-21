import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSubdomain from '../../hooks/useSubdomain'
import api from '../../services/api'

function CompanyLanding() {
  const navigate = useNavigate()
  const { companySlug } = useSubdomain()
  const [branding, setBranding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!companySlug) return
    api.get(`/public/company-info/${companySlug}`)
      .then(res => setBranding(res.data.data))
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [companySlug])

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-white mb-3">Portal Not Found</h1>
        <p className="font-body text-gray-400 text-sm">
          No active portal found for <span className="text-amber-400 font-medium">{companySlug}.shnoor.com</span>.
        </p>
        <p className="font-body text-xs text-gray-600 mt-8">Powered by SHNOOR HRMS</p>
      </div>
    </div>
  )

  const isSuspended = branding?.status === 'suspended'
  const displayName = branding?.display_name || branding?.name || companySlug
  const tagline = branding?.tagline || 'Streamline your HR operations'
  const logoUrl = branding?.logo_url
  const primaryColor = branding?.primary_color || '#D97706'

  return (
    <div
      className="min-h-screen flex flex-col"
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

      {/* Main Hero */}
      <div className="flex-1 relative bg-gray-900 flex flex-col overflow-hidden">

        {/* Background gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
            style={{ backgroundColor: primaryColor }}
          />
          <div
            className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
            style={{ backgroundColor: primaryColor }}
          />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={displayName}
                className="h-8 w-auto object-contain opacity-90"
                onError={e => { e.target.style.display = 'none' }} />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-white font-display font-bold text-sm uppercase">
                  {displayName?.[0]}
                </span>
              </div>
            )}
            <span className="font-display text-white font-semibold text-sm capitalize opacity-80">
              {displayName}
            </span>
          </div>
          <button
            onClick={() => navigate(`/login${window.location.search}`)}
            className="font-display text-sm font-semibold text-white border border-gray-700 hover:border-gray-500 px-5 py-2 rounded-lg transition hover:bg-gray-800"
          >
            Staff Login
          </button>
        </div>

        {/* Center Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center py-20">

          {/* Logo */}
          {logoUrl ? (
            <div className="mb-8">
              <img src={logoUrl} alt={displayName}
                className="h-24 w-auto object-contain mx-auto drop-shadow-2xl"
                onError={e => { e.target.style.display = 'none' }} />
            </div>
          ) : (
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="text-white font-display font-bold text-4xl uppercase">
                {displayName?.[0]}
              </span>
            </div>
          )}

          {/* Company name */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 capitalize leading-tight">
            {displayName}
          </h1>

          {/* Tagline */}
          <p className="font-body text-gray-400 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed mb-12">
            {tagline}
          </p>

          {/* CTA */}
          {isSuspended ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => navigate(`/login${window.location.search}`)}
                className="font-display inline-flex items-center gap-2 text-sm font-semibold px-8 py-4 rounded-xl transition opacity-50 cursor-not-allowed text-white border border-gray-700"
                disabled
              >
                Staff Login Unavailable
              </button>
              <p className="font-body text-xs text-orange-400">Portal is temporarily suspended</p>
            </div>
          ) : (
            <button
              onClick={() => navigate(`/login${window.location.search}`)}
              className="font-display inline-flex items-center gap-2 text-sm font-semibold px-8 py-4 rounded-xl transition shadow-lg hover:shadow-xl hover:opacity-90 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Login to Portal
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          )}

        </div>

        {/* Stats bar */}
        <div className="relative z-10 border-t border-gray-800">
          <div className="max-w-2xl mx-auto px-6 py-6 grid grid-cols-3 gap-6 text-center">
            {[
              { label: 'HR Management', desc: 'Complete HRMS' },
              { label: 'Attendance', desc: 'Track & manage' },
              { label: 'Payroll', desc: 'Salary & payslips' },
            ].map(item => (
              <div key={item.label}>
                <p className="font-display text-xs font-semibold text-white opacity-70">{item.label}</p>
                <p className="font-body text-xs text-gray-600 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-center py-4 border-t border-gray-800">
          <p className="font-body text-xs text-gray-600">
            Powered by{' '}
            <a href="https://shnoor.com" target="_blank" rel="noreferrer"
              className="hover:text-gray-400 transition"
              style={{ color: primaryColor }}>
              SHNOOR HRMS
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default CompanyLanding