import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getManagerDashboard, getLeaves, getExpenses } from '../../services/managerService'

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
    </div>
  )
}

function Badge({ status }) {
  const styles = {
    'Pending':  'bg-yellow-50 text-yellow-600',
    'Approved': 'bg-green-50 text-green-600',
    'Rejected': 'bg-red-50 text-red-500',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function ManagerDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ total_employees: 0, active_employees: 0, pending_leaves: 0, pending_expenses: 0 })
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [pendingExpenses, setPendingExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, leavesRes, expensesRes] = await Promise.all([
          getManagerDashboard(),
          getLeaves(),
          getExpenses()
        ])
        setStats(statsRes.data.data)
        setPendingLeaves(leavesRes.data.data.filter(l => l.status === 'Pending').slice(0, 3))
        setPendingExpenses(expensesRes.data.data.filter(e => e.status === 'Pending').slice(0, 3))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Welcome back, {user?.first_name}!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={stats.total_employees} />
        <StatCard label="Active Employees" value={stats.active_employees} />
        <StatCard label="Pending Leaves" value={stats.pending_leaves} />
        <StatCard label="Pending Expenses" value={stats.pending_expenses} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Pending Leaves</h2>
            <a href="/manager/leaves" className="text-xs text-blue-600 hover:underline font-medium">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium">Employee</th>
                  <th className="text-left px-6 py-3 font-medium">Type</th>
                  <th className="text-left px-6 py-3 font-medium">Days</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-8 text-sm text-gray-400">No pending leaves</td></tr>
                ) : (
                  pendingLeaves.map(leave => (
                    <tr key={leave.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-3 text-sm font-medium text-gray-700">{leave.first_name} {leave.last_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{leave.leave_type}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{leave.days}</td>
                      <td className="px-6 py-3"><Badge status={leave.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Pending Expenses</h2>
            <a href="/manager/expenses" className="text-xs text-blue-600 hover:underline font-medium">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium">Employee</th>
                  <th className="text-left px-6 py-3 font-medium">Title</th>
                  <th className="text-left px-6 py-3 font-medium">Amount</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingExpenses.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-8 text-sm text-gray-400">No pending expenses</td></tr>
                ) : (
                  pendingExpenses.map(exp => (
                    <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-3 text-sm font-medium text-gray-700">{exp.first_name} {exp.last_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{exp.title}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-700">₹{Number(exp.amount).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3"><Badge status={exp.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ManagerDashboard