import { useState, useEffect } from 'react'
import { getMyExpenses, submitExpense } from '../../services/employeeService'

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

function EmployeeExpenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({ title: '', amount: '', category: 'Travel' })

  useEffect(() => { fetchExpenses() }, [])

  const fetchExpenses = async () => {
    try {
      const res = await getMyExpenses()
      setExpenses(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    try {
      await submitExpense(formData)
      setShowAddModal(false)
      setFormData({ title: '', amount: '', category: 'Travel' })
      fetchExpenses()
    } catch (err) {
      console.error(err)
    }
  }

  const addForm = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
          placeholder="e.g. Cab to client office"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
        <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option>Travel</option><option>Food</option><option>Accommodation</option><option>Office Supplies</option><option>Other</option>
        </select>
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Expenses</h1>
          <p className="text-sm text-gray-400 mt-1">Submit and track expense claims</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
          + Submit Expense
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Title</th>
                <th className="text-left px-6 py-3 font-medium">Category</th>
                <th className="text-left px-6 py-3 font-medium">Amount</th>
                <th className="text-left px-6 py-3 font-medium">Date</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-sm text-gray-400">No expenses yet</td></tr>
              ) : (
                expenses.map((exp, index) => (
                  <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{exp.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{exp.category}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700">₹{Number(exp.amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(exp.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4"><Badge status={exp.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <Modal title="Submit Expense" onClose={() => setShowAddModal(false)}>
          {addForm}
          <div className="flex gap-3 mt-6">
            <button onClick={handleAdd} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Submit</button>
            <button onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default EmployeeExpenses