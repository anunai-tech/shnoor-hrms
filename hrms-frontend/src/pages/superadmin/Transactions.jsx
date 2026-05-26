// Superadmin transactions — full payment history plus manual payment verification tab.
// Pending verification moved here from Invoices page for better UX context.

import { useState, useEffect } from 'react'
import { getTransactions, getPendingPayments, verifyManualPayment, rejectManualPayment } from '../../services/superadminService'

function Badge({ status }) {
  const styles = {
    'Paid': 'bg-green-50 text-green-600',
    'Pending': 'bg-yellow-50 text-yellow-600',
    'Failed': 'bg-red-50 text-red-500'
  }
  return (
    <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function ConfirmModal({ message, onConfirm, onCancel, confirmLabel, danger }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <p className="font-display text-base font-semibold text-gray-800 mb-2">Are you sure?</p>
        <p className="font-body text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`font-display flex-1 text-white text-sm font-semibold py-2.5 rounded-lg transition ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-400 hover:bg-yellow-500'}`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function AllTransactions() {
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

  if (loading) return <div className="flex items-center justify-center h-40"><p className="font-body text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="font-body text-xs text-gray-400 font-medium uppercase tracking-wide">Total Revenue</p>
          <p className="font-display text-2xl font-bold text-gray-800 mt-2">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="font-body text-xs text-gray-400 font-medium uppercase tracking-wide">Paid</p>
          <p className="font-display text-2xl font-bold text-green-600 mt-2">{totalPaid}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="font-body text-xs text-gray-400 font-medium uppercase tracking-wide">Pending</p>
          <p className="font-display text-2xl font-bold text-yellow-500 mt-2">{totalPending}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="font-body text-xs text-gray-400 font-medium uppercase tracking-wide">Failed</p>
          <p className="font-display text-2xl font-bold text-red-500 mt-2">{totalFailed}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by company..."
            className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          <div className="flex gap-2">
            {['All', 'Paid', 'Pending', 'Failed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`font-display px-4 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === s ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="font-display text-left px-6 py-3 font-medium">#</th>
                <th className="font-display text-left px-6 py-3 font-medium">Company</th>
                <th className="font-display text-left px-6 py-3 font-medium">Plan</th>
                <th className="font-display text-left px-6 py-3 font-medium">Amount</th>
                <th className="font-display text-left px-6 py-3 font-medium">Gateway</th>
                <th className="font-display text-left px-6 py-3 font-medium">Status</th>
                <th className="font-display text-left px-6 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="font-body text-center py-10 text-sm text-gray-400">No transactions found</td></tr>
              ) : (
                filtered.map((t, index) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="font-body px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="font-display px-6 py-4 text-sm font-medium text-gray-800">{t.company_name}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{t.plan}</td>
                    <td className="font-display px-6 py-4 text-sm font-semibold text-gray-700">₹{Number(t.amount).toLocaleString('en-IN')}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500 capitalize">{t.gateway || t.type || '—'}</td>
                    <td className="px-6 py-4"><Badge status={t.status} /></td>
                    <td className="font-body px-6 py-4 text-sm text-gray-400">{new Date(t.payment_date || t.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="font-body text-xs text-gray-400">Showing {filtered.length} of {transactions.length} transactions</p>
        </div>
      </div>
    </div>
  )
}

function PendingVerification() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [screenshotModal, setScreenshotModal] = useState(null)

  useEffect(() => { fetchPending() }, [])

  const fetchPending = async () => {
    try {
      const res = await getPendingPayments()
      setPayments(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (id) => {
    setProcessing(id)
    try {
      await verifyManualPayment(id)
      setPayments(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
      setConfirm(null)
    }
  }

  const handleReject = async (id) => {
    setProcessing(id)
    try {
      await rejectManualPayment(id)
      setPayments(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
      setConfirm(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-40"><p className="font-body text-gray-400 text-sm">Loading...</p></div>

  return (
    <div className="space-y-4">
      {payments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="font-display text-sm font-semibold text-amber-800">
            {payments.length} payment{payments.length > 1 ? 's' : ''} awaiting verification
          </p>
          <p className="font-body text-xs text-amber-600 mt-1">
            Cross-check each payment against your bank statement before verifying.
            Verifying activates the client's subscription immediately.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="font-display text-left px-6 py-3 font-medium">#</th>
                <th className="font-display text-left px-6 py-3 font-medium">Company</th>
                <th className="font-display text-left px-6 py-3 font-medium">Plan</th>
                <th className="font-display text-left px-6 py-3 font-medium">Amount</th>
                <th className="font-display text-left px-6 py-3 font-medium">Gateway</th>
                <th className="font-display text-left px-6 py-3 font-medium">Reference</th>
                <th className="font-display text-left px-6 py-3 font-medium">Screenshot</th>
                <th className="font-display text-left px-6 py-3 font-medium">Date</th>
                <th className="font-display text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="font-body text-center py-12 text-sm text-gray-400">
                    No payments pending verification.
                  </td>
                </tr>
              ) : (
                payments.map((p, index) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="font-body px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-display text-sm font-medium text-gray-800">{p.company_name}</p>
                      <p className="font-body text-xs text-gray-400">{p.company_email}</p>
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{p.plan}</td>
                    <td className="font-display px-6 py-4 text-sm font-semibold text-gray-800">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500 capitalize">{p.gateway}</td>
                    <td className="font-body px-6 py-4 text-xs text-gray-400">{p.gateway_order_id || '—'}</td>
                    <td className="px-6 py-4">
                      {p.screenshot_url ? (
                        <button
                          onClick={() => setScreenshotModal(p.screenshot_url)}
                          className="font-display text-xs text-blue-600 hover:underline font-medium"
                        >
                          View
                        </button>
                      ) : (
                        <span className="font-body text-xs text-gray-300">None</span>
                      )}
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-400">
                      {new Date(p.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirm({ type: 'verify', id: p.id, company: p.company_name })}
                          disabled={processing === p.id}
                          className="font-display text-xs bg-green-50 text-green-600 hover:bg-green-100 font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'reject', id: p.id, company: p.company_name })}
                          disabled={processing === p.id}
                          className="font-display text-xs bg-red-50 text-red-500 hover:bg-red-100 font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="font-body text-xs text-gray-400">{payments.length} pending verification</p>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          message={
            confirm.type === 'verify'
              ? `Verify payment from ${confirm.company}? This activates their subscription immediately.`
              : `Reject payment from ${confirm.company}? This cannot be undone.`
          }
          confirmLabel={confirm.type === 'verify' ? 'Yes, Verify' : 'Yes, Reject'}
          danger={confirm.type === 'reject'}
          onConfirm={() => confirm.type === 'verify' ? handleVerify(confirm.id) : handleReject(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {screenshotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4"
          onClick={() => setScreenshotModal(null)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-display text-sm font-semibold text-gray-800">Payment Screenshot</p>
              <button onClick={() => setScreenshotModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-4">
              <img src={screenshotModal} alt="Payment proof" className="w-full rounded-lg object-contain max-h-96" />
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-amber-50">
              <p className="font-body text-xs text-amber-700">
                Always verify this against your actual bank statement before approving.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Transactions() {
  const [activeTab, setActiveTab] = useState('transactions')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    getPendingPayments()
      .then(res => setPendingCount(res.data.data?.length || 0))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Transactions</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Payment history and manual payment verification</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'transactions', label: 'All Transactions' },
          { key: 'pending', label: 'Pending Verification', count: pendingCount },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`font-display flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
              activeTab === tab.key
                ? 'border-yellow-400 text-yellow-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="bg-yellow-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'transactions' && <AllTransactions />}
      {activeTab === 'pending' && <PendingVerification />}
    </div>
  )
}

export default Transactions