import { useState, useEffect } from 'react'
import { getCompanies, createCompany, updateCompany, deleteCompany, getSubscriptions } from '../../services/superadminService'

function Badge({ status }) {
  const styles = {
    'true':  'bg-green-50 text-green-600',
    'false': 'bg-red-50 text-red-500',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[String(status)] || 'bg-gray-100 text-gray-500'}`}>
      {status ? 'Active' : 'Inactive'}
    </span>
  )
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

function Companies() {
  const [companies, setCompanies] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', subscription_id: '', is_active: true
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [companiesRes, subsRes] = await Promise.all([
        getCompanies(),
        getSubscriptions()
      ])
      setCompanies(companiesRes.data.data)
      setSubscriptions(subsRes.data.data)
    } catch (err) {
      setError('Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleFormChange = (e) => {
    const value = e.target.name === 'is_active' ? e.target.value === 'true' : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
  }

  const openEdit = (company) => {
    setSelectedCompany(company)
    setFormData({
      name: company.name,
      email: company.email,
      phone: company.phone,
      subscription_id: company.subscription_id,
      is_active: company.is_active,
    })
    setShowEditModal(true)
  }

  const openDelete = (company) => {
    setSelectedCompany(company)
    setShowDeleteModal(true)
  }

  const handleAdd = async () => {
    try {
      await createCompany(formData)
      setShowAddModal(false)
      setFormData({ name: '', email: '', phone: '', subscription_id: '', is_active: true })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create company')
    }
  }

  const handleEdit = async () => {
    try {
      await updateCompany(selectedCompany.id, formData)
      setShowEditModal(false)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update company')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCompany(selectedCompany.id)
      setShowDeleteModal(false)
      fetchData()
    } catch (err) {
      setError('Failed to delete company')
    }
  }

  
  const formFields = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
        <input name="name" value={formData.name} onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input name="email" value={formData.email} onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input name="phone" value={formData.phone} onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
          <select name="subscription_id" value={formData.subscription_id} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="">Select plan</option>
            {subscriptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select name="is_active" value={String(formData.is_active)} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Companies</h1>
          <p className="text-sm text-gray-400 mt-1">Manage all registered companies</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
          + Add Company
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name or email..."
            className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Company</th>
                <th className="text-left px-6 py-3 font-medium">Phone</th>
                <th className="text-left px-6 py-3 font-medium">Plan</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Joined</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-sm text-gray-400">No companies found</td></tr>
              ) : (
                filtered.map((company, index) => (
                  <tr key={company.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800">{company.name}</p>
                      <p className="text-xs text-gray-400">{company.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{company.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{company.subscription_name || 'Default'}</td>
                    <td className="px-6 py-4"><Badge status={company.is_active} /></td>
                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(company.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(company)} className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => openDelete(company)} className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Showing {filtered.length} of {companies.length} companies</p>
        </div>
      </div>

      {showAddModal && (
        <Modal title="Add New Company" onClose={() => setShowAddModal(false)}>
          {formFields}
          <div className="flex gap-3 mt-6">
            <button onClick={handleAdd} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold py-2.5 rounded-lg transition">Add Company</button>
            <button onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {showEditModal && (
        <Modal title="Edit Company" onClose={() => setShowEditModal(false)}>
          {formFields}
          <div className="flex gap-3 mt-6">
            <button onClick={handleEdit} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold py-2.5 rounded-lg transition">Save Changes</button>
            <button onClick={() => setShowEditModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal title="Delete Company" onClose={() => setShowDeleteModal(false)}>
          <p className="text-sm text-gray-600">Are you sure you want to delete <span className="font-semibold text-gray-800">{selectedCompany?.name}</span>?</p>
          <div className="flex gap-3 mt-6">
            <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Delete</button>
            <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Companies