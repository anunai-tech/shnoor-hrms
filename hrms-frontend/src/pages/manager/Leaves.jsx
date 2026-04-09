import { useState, useEffect } from 'react'
import { getLeaves, updateLeaveStatus } from '../../services/managerService'

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

function Leaves() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)

  useEffect(() => { fetchLeaves() }, [])

  const fetchLeaves = async () => {
    try {
      const res = await getLeaves()
      setLeaves(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = leaves.filter(l => statusFilter === 'All' || l.status === statusFilter)

  const handleStatus = async (id, status) => {
    try {
      await updateLeaveStatus(id, status)
      setLeaves(leaves.map(l => l.id === id ? { ...l, status } : l))
      setShowViewModal(false)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Leaves</h1>
        <p className="text-sm text-gray-400 mt-1">Manage employee leave requests</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex gap-2">
          {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Employee</th>
                <th className="text-left px-6 py-3 font-medium">Type</th>
                <th className="text-left px-6 py-3 font-medium">From</th>
                <th className="text-left px-6 py-3 font-medium">To</th>
                <th className="text-left px-6 py-3 font-medium">Days</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-10 text-sm text-gray-400">No leaves found</td></tr>
              ) : (
                filtered.map((leave, index) => (
                  <tr key={leave.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{leave.first_name} {leave.last_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{leave.leave_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(leave.start_date).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(leave.end_date).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{leave.days}</td>
                    <td className="px-6 py-4"><Badge status={leave.status} /></td>
                    <td className="px-6 py-4">
                      <button onClick={() => { setSelectedLeave(leave); setShowViewModal(true) }}
                        className="text-xs text-blue-600 hover:underline font-medium">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Showing {filtered.length} of {leaves.length} requests</p>
        </div>
      </div>

      {showViewModal && selectedLeave && (
        <Modal title="Leave Request" onClose={() => setShowViewModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-400 font-medium mb-1">Employee</p><p className="text-sm font-semibold text-gray-800">{selectedLeave.first_name} {selectedLeave.last_name}</p></div>
              <div><p className="text-xs text-gray-400 font-medium mb-1">Leave Type</p><p className="text-sm text-gray-700">{selectedLeave.leave_type}</p></div>
              <div><p className="text-xs text-gray-400 font-medium mb-1">From</p><p className="text-sm text-gray-700">{new Date(selectedLeave.start_date).toLocaleDateString('en-GB')}</p></div>
              <div><p className="text-xs text-gray-400 font-medium mb-1">To</p><p className="text-sm text-gray-700">{new Date(selectedLeave.end_date).toLocaleDateString('en-GB')}</p></div>
              <div><p className="text-xs text-gray-400 font-medium mb-1">Days</p><p className="text-sm text-gray-700">{selectedLeave.days}</p></div>
              <div><p className="text-xs text-gray-400 font-medium mb-1">Status</p><Badge status={selectedLeave.status} /></div>
            </div>
            <div><p className="text-xs text-gray-400 font-medium mb-1">Reason</p><p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedLeave.reason}</p></div>
          </div>
          {selectedLeave.status === 'Pending' && (
            <div className="flex gap-3 mt-6">
              <button onClick={() => handleStatus(selectedLeave.id, 'Approved')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Approve</button>
              <button onClick={() => handleStatus(selectedLeave.id, 'Rejected')}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Reject</button>
            </div>
          )}
          <button onClick={() => setShowViewModal(false)}
            className="w-full mt-3 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Close</button>
        </Modal>
      )}
    </div>
  )
}

export default Leaves