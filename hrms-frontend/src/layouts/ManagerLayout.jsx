import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMessaging } from '../context/MessagingContext'
import { PlanProvider, usePlan } from '../context/PlanContext'
import ThemeSwitcher from '../components/ThemeSwitcher'
import api from '../services/api'

const MANAGER_GATE_MAP = {
  '/manager/expenses': 'expenses',
  '/manager/salary': 'salary_payslips',
  '/manager/offboarding': 'offboarding',
  '/manager/letters': 'letters',
  '/manager/messages': 'messaging',
}
const SELF_GATE_MAP = {
  '/manager/self/expenses': 'expenses',
  '/manager/self/salary': 'salary_payslips',
  '/manager/self/letters': 'letters',
  '/manager/self/offboarding': 'offboarding',
  '/manager/messages': 'messaging',
}

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
  { label: 'Messages', path: '/manager/messages' },
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

function ManagerLayoutInner({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [activeTab, setActiveTab] = useState('manager')
  const { features } = usePlan()
  const { user, setUser, logout } = useAuth()
  const { unreadCount } = useMessaging()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/manager/self/profile')
      .then(res => { if (res.data?.data) setUser({ ...user, ...res.data.data }) })
      .catch(() => { })
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
    const slug = sessionStorage.getItem('companySlug')
    logout()
    // keep slug in sessionStorage so CompanyLoginPage still works
    navigate(slug ? `/login?company=${slug}` : '/login')
  }
  const handleNavClick = () => { if (window.innerWidth < 768) setSidebarOpen(false) }
  const enhanceNav = (items, gateMap) => items.map(item => {
    const key = gateMap[item.path]
    if (!key || !features) return item
    return { ...item, locked: features[key]?.enabled === false }
  })
  const currentNavItems = activeTab === 'manager'
    ? enhanceNav(managerNavItems, MANAGER_GATE_MAP)
    : enhanceNav(selfNavItems, SELF_GATE_MAP)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed md:relative z-30 md:z-auto h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:translate-x-0'}`}>

        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img src="/shnoor-logo.png" alt="SHNOOR" className="h-9 w-auto object-contain" />
            <div>
              <p className="font-display text-sm font-bold text-gray-800 leading-tight">SHNOOR</p>
              <p className="font-body text-xs text-gray-400 leading-tight">International LLC</p>
            </div>
          </div>
        </div>

        {/* Self / Manager tab toggle */}
        <div className="flex border-b border-gray-200">
          <button onClick={() => { setActiveTab('self'); navigate('/manager/self/dashboard') }}
            className={`font-display flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'self' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}>
            Self
          </button>
          <button onClick={() => { setActiveTab('manager'); navigate('/manager/dashboard') }}
            className={`font-display flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'manager' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}>
            Manager
          </button>
        </div>


        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {currentNavItems.map((item) => (
            <NavLink key={item.path} to={item.path} onClick={handleNavClick}
              className={({ isActive }) => `font-display flex items-center px-4 py-2.5 mx-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                item.locked
                  ? 'text-gray-300 hover:bg-gray-50'
                  : isActive
                    ? 'bg-amber-50 text-primary'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}>
              <span className={item.locked ? 'opacity-60' : ''}>{item.label}</span>
              {item.locked ? (
                <svg className="ml-auto w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : item.path === '/manager/messages' && unreadCount > 0 ? (
                <span className="font-display ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
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
              <p className="font-display text-sm font-semibold text-gray-800 truncate max-w-[120px] md:max-w-none">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="font-body text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button onClick={() => navigate('/manager/self/profile')}
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              {user?.profile_photo ? (
                <img src={user.profile_photo} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-white font-bold text-sm">{user?.first_name?.charAt(0) || 'M'}</span>
              )}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

function ManagerLayout({ children }) {
  return (
    <PlanProvider endpoint="/manager/plan-features">
      <ManagerLayoutInner>{children}</ManagerLayoutInner>
    </PlanProvider>
  )
}

export default ManagerLayout