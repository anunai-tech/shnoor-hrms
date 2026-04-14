import { useState, useEffect } from 'react'
import { getMyLeaves, applyLeave } from '../../services/managerService'

function Badge({ status }) {
  const styles = { 'Pending': 'bg-yellow-50 text-yellow-600', 'Approved': 'bg-green-50 text-green-600', 'Rejected': 'bg-red-50 text-red-500' }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function SelfLeaves() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [formData, setFormData] = useState({ leave_type: 'Paid Leave', start_date: '', end_date: '', reason: '' })

  useEffect(() => { fetchLeaves() }, [])

  const fetchLeaves = async () => {
    try {
      const res = await getMyLeaves()
      setLeaves(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    try {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
      await applyLeave({ ...formData, days })
      setShowApplyModal(false)
      setFormData({ leave_type: 'Paid Leave', start_date: '', end_date: '', reason: '' })
      fetchLeaves()
    } catch (err) {
      console.error(err)
    }
  }

  // Compute from already-fetched leaves 
  const approved = leaves.filter(l => l.status === 'Approved')
  const paidUsed   = approved.filter(l => l.leave_type === 'Paid Leave').reduce((s, l) => s + Number(l.days), 0)
  const sickUsed   = approved.filter(l => l.leave_type === 'Sick Leave').reduce((s, l) => s + Number(l.days), 0)
  const casualUsed = approved.filter(l => l.leave_type === 'Casual Leave').reduce((s, l) => s + Number(l.days), 0)
  const unpaidUsed = approved.filter(l => l.leave_type === 'Unpaid Leave').reduce((s, l) => s + Number(l.days), 0)

  const leaveCards = [
    { type: 'Paid Leaves',   total: 12,   used: paidUsed,   isUnpaid: false },
    { type: 'Sick Leaves',   total: 6,    used: sickUsed,   isUnpaid: false },
    { type: 'Casual Leaves', total: 6,    used: casualUsed, isUnpaid: false },
    { type: 'Unpaid Leaves', total: null, used: unpaidUsed, isUnpaid: true  },
  ]

  const applyForm = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
        <select value={formData.leave_type} onChange={e => setFormData({...formData, leave_type: e.target.value})}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option>Paid Leave</option>
          <option>Sick Leave</option>
          <option>Casual Leave</option>
          <option>Unpaid Leave</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
        <textarea value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}
          rows={3} placeholder="Reason for leave..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Leaves</h1>
          <p className="text-sm text-gray-400 mt-1">View and apply for leaves</p>
        </div>
        <button onClick={() => setShowApplyModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
          + Apply Leave
        </button>
      </div>

      {/* Leave Balance Cards — 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {leaveCards.map(lb => (
          <div key={lb.type} className={`rounded-xl p-5 shadow-sm border ${lb.isUnpaid ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'}`}>
            <p className={`text-sm font-medium ${lb.isUnpaid ? 'text-orange-500' : 'text-gray-500'}`}>{lb.type}</p>
            <p className={`text-3xl font-bold mt-2 ${lb.isUnpaid ? 'text-orange-600' : 'text-gray-800'}`}>
              {lb.isUnpaid ? lb.used : Math.max(0, lb.total - lb.used)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {lb.isUnpaid ? 'days taken (approved)' : `${lb.used} used of ${lb.total}`}
            </p>
          </div>
        ))}
      </div>

      {/* Leave History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Leave History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">Type</th>
                <th className="text-left px-6 py-3 font-medium">From</th>
                <th className="text-left px-6 py-3 font-medium">To</th>
                <th className="text-left px-6 py-3 font-medium">Days</th>
                <th className="text-left px-6 py-3 font-medium">Reason</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-sm text-gray-400">No leave requests yet</td></tr>
              ) : (
                leaves.map(leave => (
                  <tr key={leave.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{leave.leave_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(leave.start_date).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(leave.end_date).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{leave.days}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{leave.reason}</td>
                    <td className="px-6 py-4"><Badge status={leave.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showApplyModal && (
        <Modal title="Apply for Leave" onClose={() => setShowApplyModal(false)}>
          {applyForm}
          <div className="flex gap-3 mt-6">
            <button onClick={handleApply} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Submit</button>
            <button onClick={() => setShowApplyModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default SelfLeaves