import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeSwitcher from '../components/ThemeSwitcher'
import api from '../services/api'

const navItems = [
  { label: 'Dashboard', path: '/superadmin/dashboard' },
  { label: 'Companies', path: '/superadmin/companies' },
  { label: 'Subscriptions', path: '/superadmin/subscriptions' },
  { label: 'Transactions', path: '/superadmin/transactions' },
  { label: 'Admin Management', path: '/superadmin/admin-management' },
  { label: 'Contact Queries', path: '/superadmin/contact-queries' },
  { label: 'Website Settings', path: '/superadmin/website-settings' },
  { label: 'Settings', path: '/superadmin/settings' },
  { label: 'Profile', path: '/superadmin/profile' },
]

function SuperAdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/profile-picture')
      .then(res => setAvatarUrl(res.data?.data?.url || null))
      .catch(() => setAvatarUrl(null))
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false)
      else setSidebarOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:relative z-30 md:z-auto
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:translate-x-0'}
        h-full bg-white border-r border-gray-200
        flex flex-col
        transition-all duration-300 ease-in-out
        flex-shrink-0 overflow-hidden
      `}>

        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img
              src="/shnoor-logo.png"
              alt="SHNOOR"
              className="h-9 w-auto object-contain"
            />
            <div>
              <p className="text-sm font-bold text-gray-800 leading-tight">SHNOOR</p>
              <p className="text-xs text-gray-400 leading-tight">International LLC</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) => `
                flex items-center px-4 py-2.5 mx-3 rounded-lg
                text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }
              `}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            Logout
          </button>
        </div>

      </aside>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex flex-col gap-1 p-2 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
          >
            <div className="w-5 h-0.5 bg-gray-600"></div>
            <div className="w-5 h-0.5 bg-gray-600"></div>
            <div className="w-5 h-0.5 bg-gray-600"></div>
          </button>

          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <ThemeSwitcher />
            <div className="text-right hidden sm:block min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px] md:max-w-none">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={() => navigate('/superadmin/profile')}
              className="w-9 h-9 rounded-full overflow-hidden bg-yellow-400 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
            >
              {avatarUrl ? (
                <img
                  src={`http://localhost:5000${avatarUrl}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-sm">
                  {user?.first_name?.charAt(0) || 'S'}
                </span>
              )}
            </button>
          </div>

        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>

      </div>
    </div>
  )
}

export default SuperAdminLayout