import { useState, useEffect } from 'react'
import { getExpenses, updateExpenseStatus } from '../../services/managerService'

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

function ManagerExpenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)

  useEffect(() => { fetchExpenses() }, [])

  const fetchExpenses = async () => {
    try {
      const res = await getExpenses()
      setExpenses(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = expenses.filter(e => statusFilter === 'All' || e.status === statusFilter)

  const handleStatus = async (id, status) => {
    try {
      await updateExpenseStatus(id, status)
      setExpenses(expenses.map(e => e.id === id ? { ...e, status } : e))
      setShowViewModal(false)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
        <p className="text-sm text-gray-400 mt-1">Review and approve employee expense claims</p>
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
                <th className="text-left px-6 py-3 font-medium">Title</th>
                <th className="text-left px-6 py-3 font-medium">Category</th>
                <th className="text-left px-6 py-3 font-medium">Amount</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Date</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-10 text-sm text-gray-400">No expenses found</td></tr>
              ) : (
                filtered.map((exp, index) => (
                  <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{exp.first_name} {exp.last_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{exp.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{exp.category}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700">₹{Number(exp.amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4"><Badge status={exp.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(exp.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => { setSelectedExpense(exp); setShowViewModal(true) }}
                        className="text-xs text-blue-600 hover:underline font-medium">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Showing {filtered.length} of {expenses.length} claims</p>
        </div>
      </div>

      {showViewModal && selectedExpense && (
        <Modal title="Expense Claim" onClose={() => setShowViewModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-400 font-medium mb-1">Employee</p><p className="text-sm font-semibold text-gray-800">{selectedExpense.first_name} {selectedExpense.last_name}</p></div>
              <div><p className="text-xs text-gray-400 font-medium mb-1">Amount</p><p className="text-sm font-bold text-gray-800">₹{Number(selectedExpense.amount).toLocaleString('en-IN')}</p></div>
              <div><p className="text-xs text-gray-400 font-medium mb-1">Title</p><p className="text-sm text-gray-700">{selectedExpense.title}</p></div>
              <div><p className="text-xs text-gray-400 font-medium mb-1">Category</p><p className="text-sm text-gray-700">{selectedExpense.category}</p></div>
              <div><p className="text-xs text-gray-400 font-medium mb-1">Date</p><p className="text-sm text-gray-700">{new Date(selectedExpense.created_at).toLocaleDateString('en-GB')}</p></div>
              <div><p className="text-xs text-gray-400 font-medium mb-1">Status</p><Badge status={selectedExpense.status} /></div>
            </div>
          </div>
          {selectedExpense.status === 'Pending' && (
            <div className="flex gap-3 mt-6">
              <button onClick={() => handleStatus(selectedExpense.id, 'Approved')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Approve</button>
              <button onClick={() => handleStatus(selectedExpense.id, 'Rejected')}
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

export default ManagerExpenses