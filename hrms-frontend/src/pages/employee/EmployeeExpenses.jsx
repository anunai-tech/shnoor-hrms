import { useState, useEffect } from 'react'
import { getMyExpenses, submitExpense } from '../../services/employeeService'
import { usePlan } from '../../context/PlanContext'
import FeatureGateScreen from '../../components/FeatureGateScreen'

function Badge({ status }) {
  const styles = { 'Pending': 'bg-yellow-50 text-yellow-600', 'Approved': 'bg-green-50 text-green-600', 'Rejected': 'bg-red-50 text-red-500' }
  return <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-display text-base font-semibold text-gray-800">{title}</h3>
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
        <label className="font-display block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. Cab to client office"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label className="font-display block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
        <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label className="font-display block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option>Travel</option><option>Food</option><option>Accommodation</option><option>Office Supplies</option><option>Other</option>
        </select>
      </div>
    </div>
  )

  const { features, loading: planLoading } = usePlan()
  if (planLoading) return null
  if (!features?.expenses?.enabled) return <FeatureGateScreen featureName="Expense Management" />
  if (loading) return (
    <div className="flex items-center justify-center h-64"><p className="font-body text-gray-400">Loading...</p></div>
  )

  return (
    <div className="space-y-6">
      {features?.expenses?.warning && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="font-body text-sm text-amber-700">
            <span className="font-display font-semibold">Approaching monthly limit — </span>
            {features.expenses.remaining} expense submission{features.expenses.remaining !== 1 ? 's' : ''} remaining this month (limit: {features.expenses.limit}).
          </p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">My Expenses</h1>
          <p className="font-body text-sm text-gray-400 mt-1">Submit and track expense claims</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="font-display bg-primary hover:opacity-90 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          + Submit Expense
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="font-display text-left px-6 py-3 font-medium">#</th>
                <th className="font-display text-left px-6 py-3 font-medium">Title</th>
                <th className="font-display text-left px-6 py-3 font-medium">Category</th>
                <th className="font-display text-left px-6 py-3 font-medium">Amount</th>
                <th className="font-display text-left px-6 py-3 font-medium">Date</th>
                <th className="font-display text-left px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan="6" className="font-body text-center py-10 text-sm text-gray-400">No expenses yet</td></tr>
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
            <button onClick={handleAdd} className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition">Submit</button>
            <button onClick={() => setShowAddModal(false)} className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>          </div>
        </Modal>
      )}
    </div>
  )
}

export default EmployeeExpenses