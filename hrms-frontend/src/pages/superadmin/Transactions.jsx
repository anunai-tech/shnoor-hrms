import { useState, useEffect } from 'react'
import { getTransactions } from '../../services/superadminService'

function Badge({ status }) {
  const styles = { 'Paid': 'bg-green-50 text-green-600', 'Pending': 'bg-yellow-50 text-yellow-600', 'Failed': 'bg-red-50 text-red-500' }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
}

function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    getTransactions()
      .then(res => setTransactions(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = transactions.filter(t => {
    const matchesSearch = t.company_name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalRevenue = transactions.filter(t => t.status === 'Paid').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalPaid = transactions.filter(t => t.status === 'Paid').length
  const totalPending = transactions.filter(t => t.status === 'Pending').length
  const totalFailed = transactions.filter(t => t.status === 'Failed').length

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
        <p className="text-sm text-gray-400 mt-1">View all payment and billing history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Paid</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{totalPaid}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-yellow-500 mt-2">{totalPending}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Failed</p>
          <p className="text-2xl font-bold text-red-500 mt-2">{totalFailed}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by company..."
            className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          <div className="flex gap-2">
            {['All', 'Paid', 'Pending', 'Failed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === s ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Company</th>
                <th className="text-left px-6 py-3 font-medium">Plan</th>
                <th className="text-left px-6 py-3 font-medium">Amount</th>
                <th className="text-left px-6 py-3 font-medium">Type</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-sm text-gray-400">No transactions found</td></tr>
              ) : (
                filtered.map((t, index) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{t.company_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.plan}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700">₹{Number(t.amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.type}</td>
                    <td className="px-6 py-4"><Badge status={t.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(t.payment_date).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Showing {filtered.length} of {transactions.length} transactions</p>
        </div>
      </div>
    </div>
  )
}

export default Transactions