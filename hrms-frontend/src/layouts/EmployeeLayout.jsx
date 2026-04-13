import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMessaging } from '../context/MessagingContext'
import ThemeSwitcher from '../components/ThemeSwitcher'
import api from '../services/api'

const navItems = [
  { label: 'Dashboard', path: '/employee/dashboard' },
  { label: 'Chat', path: '/employee/chat' },
  { label: 'Leaves', path: '/employee/leaves' },
  { label: 'Holidays', path: '/employee/holidays' },
  { label: 'Attendance', path: '/employee/attendance' },
  { label: 'Expenses', path: '/employee/expenses' },
  { label: 'Salary', path: '/employee/salary' },
  { label: 'Letters', path: '/employee/letters' },
  { label: 'Offboarding', path: '/employee/offboarding' },
  { label: 'Company Policies', path: '/employee/policies' },
  { label: 'Profile', path: '/employee/profile' },
  { label: 'Settings', path: '/employee/settings' },
]

function EmployeeLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const { user, logout } = useAuth()
  const { unreadCount } = useMessaging()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/profile-picture')
      .then(res => setAvatarUrl(res.data?.data?.url || null))
      .catch(() => setAvatarUrl(null))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* SIDEBAR */}
      <aside className={`
        ${sidebarOpen ? 'w-64' : 'w-0'}
        bg-white border-r border-gray-200
        flex flex-col
        transition-all duration-300 ease-in-out
        flex-shrink-0 overflow-hidden
      `}>

        {/* Logo */}
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

        {/* Nav Links */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center px-4 py-2.5 mx-3 rounded-lg
                text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }
              `}
            >
              <span>{item.label}</span>
              {item.path === '/employee/chat' && unreadCount > 0 && (
                <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            Logout
          </button>
        </div>

      </aside>

      {/* MAIN AREA */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex flex-col gap-1 p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="w-5 h-0.5 bg-gray-600"></div>
            <div className="w-5 h-0.5 bg-gray-600"></div>
            <div className="w-5 h-0.5 bg-gray-600"></div>
          </button>

          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={() => navigate('/employee/profile')}
              className="w-9 h-9 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              {avatarUrl ? (
                <img
                  src={`http://localhost:5000${avatarUrl}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-sm">
                  {user?.first_name?.charAt(0) || 'E'}
                </span>
              )}
            </button>
          </div>

        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>

      </div>
    </div>
  )
}

export default EmployeeLayout
