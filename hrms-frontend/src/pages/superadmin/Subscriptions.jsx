import { useState, useEffect } from 'react'
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription } from '../../services/superadminService'

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

function Subscriptions() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [formData, setFormData] = useState({ name: '', monthly_price: '', annual_price: '', max_users: '' })

  useEffect(() => { fetchPlans() }, [])

  const fetchPlans = async () => {
    try {
      const res = await getSubscriptions()
      setPlans(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const openEdit = (plan) => {
    setSelectedPlan(plan)
    setFormData({ name: plan.name, monthly_price: plan.monthly_price, annual_price: plan.annual_price, max_users: plan.max_users })
    setShowEditModal(true)
  }

  const handleAdd = async () => {
    try {
      await createSubscription(formData)
      setShowAddModal(false)
      setFormData({ name: '', monthly_price: '', annual_price: '', max_users: '' })
      fetchPlans()
    } catch (err) { console.error(err) }
  }

  const handleEdit = async () => {
    try {
      await updateSubscription(selectedPlan.id, formData)
      setShowEditModal(false)
      fetchPlans()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async () => {
    try {
      await deleteSubscription(selectedPlan.id)
      setShowDeleteModal(false)
      fetchPlans()
    } catch (err) { console.error(err) }
  }

  const formFields = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
        <input name="name" value={formData.name} onChange={handleFormChange} placeholder="e.g. Pro"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price (₹)</label>
          <input name="monthly_price" type="number" value={formData.monthly_price} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Annual Price (₹)</label>
          <input name="annual_price" type="number" value={formData.annual_price} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
        <input name="max_users" type="number" value={formData.max_users} onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Subscriptions</h1>
          <p className="text-sm text-gray-400 mt-1">Manage subscription plans for companies</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
          + Add New Plan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Plan Name</th>
                <th className="text-left px-6 py-3 font-medium">Monthly Price</th>
                <th className="text-left px-6 py-3 font-medium">Annual Price</th>
                <th className="text-left px-6 py-3 font-medium">Max Users</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan, index) => (
                <tr key={plan.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">{plan.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">₹{Number(plan.monthly_price).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">₹{Number(plan.annual_price).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{plan.max_users}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(plan)} className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                      {plan.name !== 'Default' && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => { setSelectedPlan(plan); setShowDeleteModal(true) }}
                            className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">{plans.length} plans total</p>
        </div>
      </div>

      {showAddModal && (
        <Modal title="Add New Plan" onClose={() => setShowAddModal(false)}>
          {formFields}
          <div className="flex gap-3 mt-6">
            <button onClick={handleAdd} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold py-2.5 rounded-lg transition">Add Plan</button>
            <button onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {showEditModal && (
        <Modal title="Edit Plan" onClose={() => setShowEditModal(false)}>
          {formFields}
          <div className="flex gap-3 mt-6">
            <button onClick={handleEdit} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold py-2.5 rounded-lg transition">Save Changes</button>
            <button onClick={() => setShowEditModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal title="Delete Plan" onClose={() => setShowDeleteModal(false)}>
          <p className="text-sm text-gray-600">Are you sure you want to delete <span className="font-semibold">{selectedPlan?.name}</span>?</p>
          <div className="flex gap-3 mt-6">
            <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Delete</button>
            <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Subscriptions