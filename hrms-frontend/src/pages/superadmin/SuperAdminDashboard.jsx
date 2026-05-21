import { useState, useEffect } from 'react'
import { getCompanies, getContactQueries, getClients, getSubdomainRequests } from '../../services/superadminService'

function StatCard({ label, value, change }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <p className="font-body text-sm text-gray-500 font-medium">{label}</p>
      <p className="font-display text-3xl font-bold text-gray-800 mt-2">{value}</p>
      <p className="font-body text-xs text-gray-400 mt-1">{change}</p>
    </div>
  )
}

function Badge({ status }) {
  const styles = {
    'Active': 'bg-green-50 text-green-600',
    'Inactive': 'bg-red-50 text-red-500',
    'Unread': 'bg-yellow-50 text-yellow-600',
    'Read': 'bg-gray-100 text-gray-500',
    'Replied': 'bg-amber-50 text-amber-700',
  }
  return (
    <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function SuperAdminDashboard() {
  const [companies, setCompanies] = useState([])
  const [queries, setQueries] = useState([])
  const [clients, setClients] = useState([])
  const [subdomainRequests, setSubdomainRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesRes, queriesRes, clientsRes, subdomainRes] = await Promise.all([
          getCompanies(),
          getContactQueries(),
          getClients(),
          getSubdomainRequests()
        ])
        setCompanies(companiesRes.data.data)
        setQueries(queriesRes.data.data)
        setClients(clientsRes.data.data)
        setSubdomainRequests(subdomainRes.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const activeCompanies = companies.filter(c => c.is_active).length
  const inactiveCompanies = companies.filter(c => !c.is_active).length
  const unreadQueries = queries.filter(q => q.status === 'Unread').length
  const recentCompanies = companies.slice(0, 4)
  const recentQueries = queries.slice(0, 3)

  const pendingSubdomains = subdomainRequests.filter(r => r.status === 'pending').length

  const stats = [
    { label: 'Total Companies', value: companies.length, change: `${activeCompanies} active` },
    { label: 'Total Clients', value: clients.length, change: `${clients.filter(c => c.is_active).length} active` },
    { label: 'Subdomain Requests', value: pendingSubdomains, change: pendingSubdomains > 0 ? '⚠ Needs review' : 'All reviewed' },
    { label: 'Unread Queries', value: unreadQueries, change: 'Needs attention' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="font-body text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Welcome back, here's what's happening.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} change={stat.change} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Companies */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-gray-800">Recent Companies</h2>
            <a href="/superadmin/companies" className="font-display text-xs text-yellow-600 hover:underline font-medium">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="font-display text-left px-6 py-3 font-medium">Company</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Status</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentCompanies.length === 0 ? (
                  <tr><td colSpan="3" className="font-body text-center py-8 text-sm text-gray-400">No companies yet</td></tr>
                ) : (
                  recentCompanies.map((company) => (
                    <tr key={company.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-3">
                        <p className="font-display text-sm font-medium text-gray-700">{company.name}</p>
                        <p className="font-body text-xs text-gray-400">{company.email}</p>
                      </td>
                      <td className="px-6 py-3">
                        <Badge status={company.is_active ? 'Active' : 'Inactive'} />
                      </td>
                      <td className="font-body px-6 py-3 text-sm text-gray-400">
                        {new Date(company.created_at).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Contact Queries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-gray-800">Recent Contact Queries</h2>
            <a href="/superadmin/contact-queries" className="font-display text-xs text-yellow-600 hover:underline font-medium">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="font-display text-left px-6 py-3 font-medium">Name</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Subject</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentQueries.length === 0 ? (
                  <tr><td colSpan="3" className="font-body text-center py-8 text-sm text-gray-400">No queries yet</td></tr>
                ) : (
                  recentQueries.map((query) => (
                    <tr key={query.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-3">
                        <p className="font-display text-sm font-medium text-gray-700">{query.name}</p>
                        <p className="font-body text-xs text-gray-400">{query.email}</p>
                      </td>
                      <td className="font-body px-6 py-3 text-sm text-gray-500">{query.subject}</td>
                      <td className="px-6 py-3"><Badge status={query.status} /></td>
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

export default SuperAdminDashboard