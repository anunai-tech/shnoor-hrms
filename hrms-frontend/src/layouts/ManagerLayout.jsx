import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const managerNavItems = [
  { label: 'Dashboard', path: '/manager/dashboard' },
  { label: 'Employees', path: '/manager/employees' },
  { label: 'Holidays', path: '/manager/holidays' },
  { label: 'Leaves', path: '/manager/leaves' },
  { label: 'Attendance', path: '/manager/attendance' },
  { label: 'Expenses', path: '/manager/expenses' },
  { label: 'Salary Management', path: '/manager/salary' },
  { label: 'Offboarding', path: '/manager/offboarding' },
  { label: 'Letters', path: '/manager/letters' },
  { label: 'Company Policies', path: '/manager/policies' },
  { label: 'Settings', path: '/manager/settings' },
]

const selfNavItems = [
  { label: 'Dashboard', path: '/manager/self/dashboard' },
  { label: 'Holidays', path: '/manager/self/holidays' },
  { label: 'Leaves', path: '/manager/self/leaves' },
  { label: 'Attendance', path: '/manager/self/attendance' },
  { label: 'Expenses', path: '/manager/self/expenses' },
  { label: 'Salary', path: '/manager/self/salary' },
  { label: 'Letters', path: '/manager/self/letters' },
  { label: 'Offboarding', path: '/manager/self/offboarding' },
  { label: 'Company Policies', path: '/manager/self/policies' },
  { label: 'Profile', path: '/manager/self/profile' },
]

function ManagerLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)
  const [activeTab, setActiveTab] = useState('manager')
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const currentNavItems = activeTab === 'manager' ? managerNavItems : selfNavItems

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* MOBILE BACKDROP */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64
        md:relative md:inset-auto md:z-auto
        ${sidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:translate-x-0 md:w-0'}
        bg-white border-r border-gray-200
        flex flex-col
        transition-all duration-300 ease-in-out
        flex-shrink-0 overflow-hidden
      `}>

        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src="/shnoor-logo.png" alt="SHNOOR" className="h-9 w-auto object-contain" />
            <div>
              <p className="text-sm font-bold text-gray-800 leading-tight">SHNOOR</p>
              <p className="text-xs text-gray-400 leading-tight">International LLC</p>
            </div>
          </div>
        </div>

        {/* Self / Manager Tab Toggle */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => { setActiveTab('self'); navigate('/manager/self/dashboard'); closeSidebarOnMobile() }}
            className={`flex-1 py-3 text-sm font-semibold transition-all
              ${activeTab === 'self' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Self
          </button>
          <button
            onClick={() => { setActiveTab('manager'); navigate('/manager/dashboard'); closeSidebarOnMobile() }}
            className={`flex-1 py-3 text-sm font-semibold transition-all
              ${activeTab === 'manager' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Manager
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {currentNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebarOnMobile}
              className={({ isActive }) => `
                flex items-center px-4 py-2.5 mx-3 rounded-lg
                text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }
              `}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            Logout
          </button>
        </div>

      </aside>

      {/* MAIN AREA */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex flex-col gap-1 p-2 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
          >
            <div className="w-5 h-0.5 bg-gray-600"></div>
            <div className="w-5 h-0.5 bg-gray-600"></div>
            <div className="w-5 h-0.5 bg-gray-600"></div>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{user?.first_name?.charAt(0) || 'M'}</span>
            </div>
          </div>

        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {children}
        </main>

      </div>
    </div>
  )
}

export default ManagerLayout