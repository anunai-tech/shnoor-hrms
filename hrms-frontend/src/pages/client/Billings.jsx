import { useState, useEffect } from 'react'
import api from '../../services/api'

function Billings() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/client/transactions')
      .then(res => setTransactions(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="font-body text-gray-400 text-sm">Loading billing history...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Billings</h1>
        <p className="font-body text-sm text-gray-500 mt-1">Your payment history and invoices</p>
      </div>

      {/* Payment Gateway Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-sm font-semibold text-amber-800">Payment Gateway Coming Soon</p>
          <p className="font-body text-xs text-amber-600 mt-1">
            Online payments via Razorpay/Stripe will be available soon. Contact support for manual billing.
          </p>
        </div>
        <button
          disabled
          className="font-display text-sm bg-primary text-white px-5 py-2.5 rounded-lg opacity-50 cursor-not-allowed flex-shrink-0"
        >
          Pay Now
        </button>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-display text-base font-semibold text-gray-800">Transaction History</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <p className="font-display text-sm font-semibold text-gray-600">No transactions yet</p>
            <p className="font-body text-xs text-gray-400 mt-1">Your payment history will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Plan', 'Type', 'Amount', 'Status'].map(h => (
                    <th key={h} className="font-display text-xs font-semibold text-gray-500 uppercase tracking-wide text-left px-6 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition">
                    <td className="font-body text-sm text-gray-700 px-6 py-4">
                      {new Date(tx.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="font-body text-sm text-gray-700 px-6 py-4">{tx.plan || '—'}</td>
                    <td className="font-body text-sm text-gray-700 px-6 py-4">{tx.type || '—'}</td>
                    <td className="font-display text-sm font-semibold text-gray-800 px-6 py-4">
                      ₹{Number(tx.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-body text-xs font-semibold px-2.5 py-1 rounded-full ${tx.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Billings