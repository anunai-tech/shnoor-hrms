import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeSwitcher from '../components/ThemeSwitcher'

const navItems = [
  { label: 'Dashboard', path: '/client/dashboard' },
  { label: 'Current Plan', path: '/client/plan' },
  { label: 'Usage', path: '/client/usage' },
  { label: 'Settings', path: '/client/settings' },
  { label: 'Billings', path: '/client/billings' },
  { label: 'Support', path: '/client/support' },
]

function ClientLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false)
      else setSidebarOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }
  const handleNavClick = () => { if (window.innerWidth < 768) setSidebarOpen(false) }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-30 md:z-auto h-full bg-white border-r border-gray-200
        flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img src="/shnoor-logo.png" alt="SHNOOR" className="h-9 w-auto object-contain" />
            <div>
              <p className="font-display text-sm font-bold text-gray-800 leading-tight">Client Area</p>
              <p className="font-body text-xs text-primary leading-tight font-medium">SHNOOR HRMS</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} onClick={handleNavClick}
              className={({ isActive }) => `
                font-display flex items-center px-4 py-2.5 mx-3 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive ? 'bg-amber-50 text-primary' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}
              `}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button onClick={handleLogout}
            className="font-display flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* Header */}
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
              <p className="font-display text-sm font-semibold text-gray-800 truncate max-w-[150px] md:max-w-none">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="font-body text-xs text-primary font-medium">Client Account</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="font-display text-white font-bold text-sm">
                {user?.first_name?.charAt(0) || 'C'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default ClientLayout