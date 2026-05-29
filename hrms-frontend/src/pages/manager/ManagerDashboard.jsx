import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getManagerDashboard, getLeaves, getExpenses } from '../../services/managerService'
import { useMessaging } from '../../context/MessagingContext'
import { usePlan } from '../../context/PlanContext'

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <p className="font-body text-sm text-gray-500 font-medium">{label}</p>
      <p className="font-display text-3xl font-bold text-gray-800 mt-2">{value}</p>
    </div>
  )
}

function Badge({ status }) {
  const styles = { 'Pending': 'bg-yellow-50 text-yellow-600', 'Approved': 'bg-green-50 text-green-600', 'Rejected': 'bg-red-50 text-red-500' }
  return <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
}

function ManagerDashboard() {
  const { user } = useAuth()
  const { unreadCount } = useMessaging()
  const { features, planName } = usePlan()
  const [stats, setStats] = useState({ total_employees: 0, active_employees: 0, pending_leaves: 0, pending_expenses: 0 })
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [pendingExpenses, setPendingExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, leavesRes] = await Promise.all([getManagerDashboard(), getLeaves()])
        setStats(statsRes.data.data)
        setPendingLeaves(leavesRes.data.data.filter(l => l.status === 'Pending').slice(0, 3))
      } catch (err) { console.error(err) }
      try {
        const expensesRes = await getExpenses()
        if (expensesRes.data?.success) {
          setPendingExpenses(expensesRes.data.data.filter(e => e.status === 'Pending').slice(0, 3))
        }
      } catch (e) { /* expenses feature gated on this plan */ }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="font-body text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Welcome back, {user?.first_name}!</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={stats.total_employees} />
        <StatCard label="Active Employees" value={stats.active_employees} />
        <StatCard label="Pending Leaves" value={stats.pending_leaves} />
        {features?.expenses?.enabled && <StatCard label="Pending Expenses" value={stats.pending_expenses} />}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-gray-800">Pending Leaves</h2>
            <a href="/manager/leaves" className="font-display text-xs text-primary hover:underline font-medium">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="font-display text-left px-6 py-3 font-medium">Employee</th>
                <th className="font-display text-left px-6 py-3 font-medium">Type</th>
                <th className="font-display text-left px-6 py-3 font-medium">Days</th>
                <th className="font-display text-left px-6 py-3 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {pendingLeaves.length === 0 ? (
                  <tr><td colSpan="4" className="font-body text-center py-8 text-sm text-gray-400">No pending leaves</td></tr>
                ) : (
                  pendingLeaves.map(leave => (
                    <tr key={leave.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="font-display px-6 py-3 text-sm font-medium text-gray-700">{leave.first_name} {leave.last_name}</td>
                      <td className="font-body px-6 py-3 text-sm text-gray-500">{leave.leave_type}</td>
                      <td className="font-body px-6 py-3 text-sm text-gray-500">{leave.days}</td>
                      <td className="px-6 py-3"><Badge status={leave.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {features?.expenses?.enabled && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-gray-800">Pending Expenses</h2>
            <a href="/manager/expenses" className="font-display text-xs text-primary hover:underline font-medium">View all</a>          </div >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="font-display text-left px-6 py-3 font-medium">Employee</th>
                <th className="font-display text-left px-6 py-3 font-medium">Title</th>
                <th className="font-display text-left px-6 py-3 font-medium">Amount</th>
                <th className="font-display text-left px-6 py-3 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {pendingExpenses.length === 0 ? (
                  <tr><td colSpan="4" className="font-body text-center py-8 text-sm text-gray-400">No pending expenses</td></tr>
                ) : (
                  pendingExpenses.map(exp => (
                    <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="font-display px-6 py-3 text-sm font-medium text-gray-700">{exp.first_name} {exp.last_name}</td>
                      <td className="font-body px-6 py-3 text-sm text-gray-500">{exp.title}</td>
                      <td className="font-display px-6 py-3 text-sm font-semibold text-gray-700">₹{Number(exp.amount).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3"><Badge status={exp.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div >
        )}
      </div>

      {/* Plan usage summary */}
      {features && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-gray-800">Plan Usage</h2>
            {planName && (
              <span className="font-display text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                {planName}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(features).map(([key, feat]) => {
              if (!feat.enabled || feat.limit === null || feat.used === null) return null
              const labels = {
                employees: 'Employees', letters: 'Letters', expenses: 'Expenses',
                salary_payslips: 'Payslips', messaging: 'Messages', holidays: 'Holidays', policies: 'Policies'
              }
              const label = labels[key]
              if (!label) return null
              const pct = feat.limit > 0 ? Math.min(Math.round((feat.used / feat.limit) * 100), 100) : 0
              return (
                <div key={key} className={`rounded-xl p-4 border ${feat.warning ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-display text-xs font-semibold text-gray-600">{label}</span>
                    {feat.warning && (
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                    )}
                  </div>
                  <p className={`font-display text-lg font-bold ${feat.warning ? 'text-amber-700' : 'text-gray-800'}`}>
                    {feat.used} <span className="text-xs font-normal text-gray-400">/ {feat.limit}</span>
                  </p>
                  <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${feat.warning ? 'bg-amber-400' : 'bg-amber-300'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerDashboard