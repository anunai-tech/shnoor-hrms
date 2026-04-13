import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMessaging } from '../context/MessagingContext'
import ThemeSwitcher from '../components/ThemeSwitcher'

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
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const { user, logout } = useAuth()
  const { unreadCount } = useMessaging()
  const navigate = useNavigate()

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
        <div className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed md:relative z-30 md:z-auto
        h-full bg-white border-r border-gray-200
        flex flex-col transition-all duration-300 ease-in-out
        flex-shrink-0 overflow-hidden
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:translate-x-0'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img src="/shnoor-logo.png" alt="SHNOOR" className="h-9 w-auto object-contain" />
            <div>
              <p className="text-sm font-bold text-gray-800 leading-tight">SHNOOR</p>
              <p className="text-xs text-gray-400 leading-tight">International LLC</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} onClick={handleNavClick}
              className={({ isActive }) => `
                flex items-center px-4 py-2.5 mx-3 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}
              `}>
              <span>{item.label}</span>
              {item.path === '/employee/chat' && unreadCount > 0 && (
                <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button onClick={handleLogout}
            className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
            Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex flex-col gap-1 p-2 rounded-lg hover:bg-gray-100 transition flex-shrink-0">
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
            <button onClick={() => navigate('/employee/profile')}
              className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">
              <span className="text-white font-bold text-sm">
                {user?.first_name?.charAt(0) || 'E'}
              </span>
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

export default EmployeeLayout