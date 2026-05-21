import { useState, useEffect } from 'react'
import { getSubdomainRequests, approveSubdomainRequest, rejectSubdomainRequest } from '../../services/superadminService'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-display text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="font-display text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function SubdomainRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => { fetchRequests() }, [])

  const fetchRequests = async () => {
    try {
      const res = await getSubdomainRequests()
      setRequests(res.data.data)
    } catch {
      setMessage('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      await approveSubdomainRequest(id)
      setMessage('Subdomain approved and portal activated successfully')
      fetchRequests()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setActionLoading(rejectModal.id)
    try {
      await rejectSubdomainRequest(rejectModal.id, rejectReason)
      setMessage('Request rejected')
      setRejectModal(null)
      setRejectReason('')
      fetchRequests()
    } catch {
      setMessage('Failed to reject request')
    } finally {
      setActionLoading(null)
    }
  }

  const statusStyles = {
    pending: 'bg-yellow-50 text-yellow-700',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-600'
  }

  const filtered = requests.filter(r => r.status === activeTab)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="font-body text-gray-400">Loading requests...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Subdomain Requests</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Review and approve company portal subdomain requests</p>
      </div>

      {message && (
        <div className="font-body bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 flex justify-between">
          {message}
          <button onClick={() => setMessage('')} className="font-bold ml-4">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {['pending', 'approved', 'rejected'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`font-display px-5 py-2 rounded-lg text-sm font-medium transition capitalize
              ${activeTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
            {tab === 'pending' && pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-display text-base font-semibold text-gray-800 capitalize">
            {activeTab} Requests ({filtered.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                {['Company', 'Client', 'Requested Subdomain', 'Requested On', 'Status', 'Actions'].map(h => (
                  <th key={h} className="font-display text-left px-6 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="font-body text-center py-12 text-sm text-gray-400">
                    No {activeTab} requests
                  </td>
                </tr>
              ) : (
                filtered.map(req => (
                  <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-display text-sm font-medium text-gray-800">{req.company_name}</p>
                      <p className="font-body text-xs text-gray-400">{req.company_email}</p>
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-600">
                      {req.first_name} {req.last_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-display text-sm font-semibold text-primary">
                        {req.requested_subdomain}.shnoor.com
                      </span>
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-400">
                      {new Date(req.requested_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-display text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusStyles[req.status]}`}>
                        {req.status}
                      </span>
                      {req.status === 'rejected' && req.rejection_reason && (
                        <p className="font-body text-xs text-gray-400 mt-1 max-w-[150px]">{req.rejection_reason}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading === req.id}
                            className="font-display text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            {actionLoading === req.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => setRejectModal(req)}
                            disabled={actionLoading === req.id}
                            className="font-display text-xs border border-red-300 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejectModal && (
        <Modal title="Reject Subdomain Request" onClose={() => { setRejectModal(null); setRejectReason('') }}>
          <p className="font-body text-sm text-gray-600 mb-4">
            Rejecting <span className="font-semibold text-gray-800">{rejectModal.requested_subdomain}.shnoor.com</span> for{' '}
            <span className="font-semibold text-gray-800">{rejectModal.company_name}</span>.
          </p>
          <div>
            <label className="font-display block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Subdomain contains restricted keywords"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 transition resize-none"
            />
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleReject}
              disabled={actionLoading === rejectModal.id}
              className="font-display flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {actionLoading === rejectModal.id ? 'Rejecting...' : 'Confirm Reject'}
            </button>
            <button
              onClick={() => { setRejectModal(null); setRejectReason('') }}
              className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default SubdomainRequests