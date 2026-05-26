import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Maps each role to its home dashboard
const DASHBOARD_MAP = {
  superadmin: '/superadmin/dashboard',
  client:     '/client/dashboard',
  manager:    '/manager/dashboard',
  employee:   '/employee/dashboard',
}

// GuestRoute — inverse of ProtectedRoute.
// If user IS logged in  → block the page, show "already logged in" UI.
// If user is NOT logged in → render children normally (login/register form).
function GuestRoute({ children }) {
  const { isLoggedIn, user, logout } = useAuth()
  const navigate = useNavigate()

  // Not logged in — show the page as normal (login form, register form, etc.)
  if (!isLoggedIn) return children

  // Already logged in — show the block screen
  const dashboard = DASHBOARD_MAP[user?.role] || '/'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">

        {/* Logo */}
        <div className="flex justify-center mb-5">
          <img
            src="/shnoor-logo.png"
            alt="SHNOOR"
            className="h-14 w-auto object-contain"
          />
        </div>

        {/* Title */}
        <h2 className="font-display text-xl font-bold text-gray-800 mb-2">
          Already Logged In
        </h2>

        {/* Message — no role, no name for security */}
        <p className="font-body text-gray-500 text-sm mb-8">
          You are already logged in. Please log out first to switch accounts.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(dashboard)}
            className="font-display w-full bg-primary hover:opacity-90 text-quaternary font-semibold py-2.5 rounded-lg transition text-sm"
          >
            Go to My Dashboard
          </button>
          <button
            onClick={logout}
            className="font-display w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition text-sm"
          >
            Log Out
          </button>
        </div>

        <p className="font-body text-center text-xs text-gray-400 mt-8">
          © 2026 SHNOOR International LLC. All rights reserved.
        </p>

      </div>
    </div>
  )
}

export default GuestRoute