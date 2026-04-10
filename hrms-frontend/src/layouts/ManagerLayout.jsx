import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMessaging } from '../context/MessagingContext'

const managerNavItems = [
  { label: 'Dashboard', path: '/manager/dashboard' },
  { label: 'Messages', path: '/manager/messages' },
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

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('manager')
  const { user, logout } = useAuth()
  const { unreadCount } = useMessaging()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const currentNavItems = activeTab === 'manager' ? managerNavItems : selfNavItems

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

        {/* Self / Manager Tab Toggle */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('self')
              navigate('/manager/self/dashboard')
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-all
              ${activeTab === 'self'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            Self
          </button>
          <button
            onClick={() => {
              setActiveTab('manager')
              navigate('/manager/dashboard')
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-all
              ${activeTab === 'manager'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-600'
              }`}
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
              {item.path === '/manager/messages' && unreadCount > 0 && (
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

          <div className="flex items-center gap-3">
            <NavLink
              to="/manager/messages"
              className={({ isActive }) => `relative inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Messages
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>

            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.first_name?.charAt(0) || 'M'}
              </span>
            </div>
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

export default ManagerLayout
