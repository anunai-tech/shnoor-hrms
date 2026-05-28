import { useState, useEffect, useCallback } from 'react'
import { getClientTransactions } from '../../services/clientService'

const fmtAmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function StatusBadge({ status }) {
  const map = {
    Paid: 'bg-green-50 text-green-700',
    Pending: 'bg-yellow-50 text-yellow-700',
    Failed: 'bg-red-50 text-red-600',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function StatusDetail({ tx }) {
  if (tx.status === 'Paid') {
    return <p className="font-body text-xs text-green-600 mt-0.5">Payment confirmed</p>
  }
  if (tx.status === 'Pending') {
    return <p className="font-body text-xs text-yellow-600 mt-0.5">Under review — activation within 24 hours</p>
  }
  if (tx.status === 'Failed') {
    if (tx.rejection_reason) {
      return <p className="font-body text-xs text-red-500 mt-0.5">Rejected: {tx.rejection_reason}</p>
    }
    return <p className="font-body text-xs text-red-500 mt-0.5">Payment was declined. Please try again.</p>
  }
  return null
}

export default function ClientTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  const load = useCallback(() => {
    setLoading(true)
    getClientTransactions()
      .then(r => { if (r.data.success) setTransactions(r.data.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'All'
    ? transactions
    : transactions.filter(t => t.status === filter)

  const counts = {
    All: transactions.length,
    Paid: transactions.filter(t => t.status === 'Paid').length,
    Pending: transactions.filter(t => t.status === 'Pending').length,
    Failed: transactions.filter(t => t.status === 'Failed').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Transactions</h1>
          <p className="font-body text-sm text-gray-400 mt-1">All payment attempts and their current status</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 font-medium transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', key: 'All', color: 'text-gray-800' },
          { label: 'Paid', key: 'Paid', color: 'text-green-600' },
          { label: 'Pending', key: 'Pending', color: 'text-yellow-600' },
          { label: 'Failed', key: 'Failed', color: 'text-red-500' },
        ].map(({ label, key, color }) => (
          <div key={key} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="font-body text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`font-display text-2xl font-bold mt-2 ${color}`}>{counts[key]}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex gap-2 flex-wrap">
          {['All', 'Paid', 'Pending', 'Failed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`font-display px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === s ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="font-display text-sm font-medium text-gray-500">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date', 'Plan', 'Amount', 'Method', 'Status', 'Details'].map(h => (
                    <th key={h} className="font-display px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition">
                    <td className="font-body px-6 py-4 text-gray-400 whitespace-nowrap text-xs">{fmtDate(tx.tx_date)}</td>
                    <td className="font-display px-6 py-4 font-medium text-gray-800">{tx.plan || '—'}</td>
                    <td className="font-display px-6 py-4 font-semibold text-gray-800 whitespace-nowrap">{fmtAmt(tx.amount)}</td>
                    <td className="font-body px-6 py-4 capitalize text-gray-500">{tx.gateway || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={tx.status} /></td>
                    <td className="px-6 py-4 max-w-xs"><StatusDetail tx={tx} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-gray-100">
              <p className="font-body text-xs text-gray-400">Showing {filtered.length} of {transactions.length} transactions</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}