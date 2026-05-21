import { useState, useEffect } from 'react'
import {
  getCompanies, updateCompany, deleteCompany, getSubscriptions, suspendCompany
} from '../../services/superadminService'
import { createClient } from '../../services/superadminService'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-display text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="font-display text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status, isActive }) {
  // prefer new status column, fallback to is_active
  const s = status || (isActive ? 'active' : 'inactive')
  const styles = {
    active: 'bg-green-50 text-green-600',
    pending: 'bg-yellow-50 text-yellow-600',
    suspended: 'bg-red-50 text-red-500',
    inactive: 'bg-gray-100 text-gray-500'
  }
  return (
    <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium capitalize ${styles[s] || styles.inactive}`}>
      {s}
    </span>
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
  const [actionLoading, setActionLoading] = useState(null)

  // add form (createClient — same as Clients page)
  const [addForm, setAddForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', password: '', company_name: ''
  })
  const [addError, setAddError] = useState('')

  // edit form
  const [editForm, setEditForm] = useState({
    name: '', email: '', phone: '', subscription_id: '', is_active: true
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [companiesRes, subsRes] = await Promise.all([
        getCompanies(), getSubscriptions()
      ])
      setCompanies(companiesRes.data.data)
      setSubscriptions(subsRes.data.data)
    } catch {
      setError('Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  const openEdit = (company) => {
    setSelectedCompany(company)
    setEditForm({
      name: company.name, email: company.email,
      phone: company.phone, subscription_id: company.subscription_id,
      is_active: company.is_active
    })
    setShowEditModal(true)
  }

  const handleAdd = async () => {
    setAddError('')
    if (!addForm.first_name || !addForm.email || !addForm.password || !addForm.company_name) {
      setAddError('Company name, first name, email and password are required')
      return
    }
    try {
      await createClient(addForm)
      setShowAddModal(false)
      setAddForm({ first_name: '', last_name: '', email: '', phone: '', password: '', company_name: '' })
      fetchData()
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to create company')
    }
  }

  const handleEdit = async () => {
    try {
      await updateCompany(selectedCompany.id, editForm)
      setShowEditModal(false)
      fetchData()
    } catch {
      setError('Failed to update company')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCompany(selectedCompany.id)
      setShowDeleteModal(false)
      fetchData()
    } catch {
      setError('Failed to delete company')
    }
  }

  const handleSuspend = async (company) => {
    const action = company.status === 'suspended' ? 'activate' : 'suspend'
    setActionLoading(company.id)
    try {
      await suspendCompany(company.id, action)
      fetchData()
    } catch {
      setError('Failed to update company status')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="font-body text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Companies</h1>
          <p className="font-body text-sm text-gray-400 mt-1">Manage all registered companies</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="font-display bg-primary hover:opacity-90 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
          + Add Company
        </button>
      </div>

      {error && (
        <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 flex justify-between">
          {error}
          <button onClick={() => setError('')} className="font-bold ml-4">×</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by company name or email..."
            className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                {['#', 'Company', 'Subdomain', 'Phone', 'Plan', 'Status', 'Last Payment', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="font-display text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="font-body text-center py-12 text-sm text-gray-400">No companies found</td>
                </tr>
              ) : filtered.map((company, index) => (
                <tr key={company.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="font-body px-4 py-4 text-sm text-gray-400">{index + 1}</td>
                  <td className="px-4 py-4">
                    <p className="font-display text-sm font-medium text-gray-800">{company.name}</p>
                    <p className="font-body text-xs text-gray-400">{company.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    {company.subdomain ? (
                      <span className="font-display text-xs font-semibold text-primary">
                        {company.subdomain}.shnoor.com
                      </span>
                    ) : (
                      <span className="font-body text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="font-body px-4 py-4 text-sm text-gray-500">{company.phone || '—'}</td>
                  <td className="font-body px-4 py-4 text-sm text-gray-500">{company.subscription_name || 'Default'}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={company.status} isActive={company.is_active} />
                  </td>
                  <td className="px-4 py-4">
                    {company.last_payment_date ? (
                      <div>
                        <span className={`font-display text-xs font-medium px-2 py-0.5 rounded-full ${company.last_payment_status === 'Paid' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {company.last_payment_status}
                        </span>
                        <p className="font-body text-xs text-gray-400 mt-0.5">
                          {new Date(company.last_payment_date).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    ) : (
                      <span className="font-body text-xs text-gray-400">No payments</span>
                    )}
                  </td>
                  <td className="font-body px-4 py-4 text-sm text-gray-400">
                    {new Date(company.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => openEdit(company)}
                        className="font-display text-xs text-blue-500 hover:underline">Edit</button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleSuspend(company)}
                        disabled={actionLoading === company.id}
                        className={`font-display text-xs hover:underline disabled:opacity-50 ${company.status === 'suspended' ? 'text-green-600' : 'text-orange-500'}`}>
                        {actionLoading === company.id ? '...' : company.status === 'suspended' ? 'Activate' : 'Suspend'}
                      </button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => { setSelectedCompany(company); setShowDeleteModal(true) }}
                        className="font-display text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Company Modal — same as Add Client */}
      {showAddModal && (
        <Modal title="Add New Company" onClose={() => { setShowAddModal(false); setAddError('') }}>
          <p className="font-body text-sm text-gray-500 mb-4">
            Adding a company creates a client account for the company owner.
          </p>
          <div className="space-y-4">
            {[
              ['company_name', 'Company Name *', 'text', 'Acme Corp'],
              ['first_name', 'Contact First Name *', 'text', 'John'],
              ['last_name', 'Contact Last Name', 'text', 'Doe'],
              ['email', 'Email Address *', 'email', 'john@acmecorp.com'],
              ['phone', 'Phone Number', 'tel', '+91 98765 43210'],
              ['password', 'Temporary Password *', 'password', 'Min. 8 characters'],
            ].map(([name, label, type, placeholder]) => (
              <div key={name}>
                <label className="font-display block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type={type} value={addForm[name]}
                  onChange={e => setAddForm(prev => ({ ...prev, [name]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition" />
              </div>
            ))}
          </div>
          {addError && <p className="font-body text-sm text-red-600 mt-4">{addError}</p>}
          <div className="flex gap-3 mt-6">
            <button onClick={handleAdd}
              className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              Create Company
            </button>
            <button onClick={() => { setShowAddModal(false); setAddError('') }}
              className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <Modal title="Edit Company" onClose={() => setShowEditModal(false)}>
          <div className="space-y-4">
            {[
              ['name', 'Company Name', 'text'],
              ['email', 'Email', 'email'],
              ['phone', 'Phone', 'tel'],
            ].map(([name, label, type]) => (
              <div key={name}>
                <label className="font-display block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type={type} value={editForm[name]}
                  onChange={e => setEditForm(prev => ({ ...prev, [name]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            ))}
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select value={editForm.subscription_id}
                onChange={e => setEditForm(prev => ({ ...prev, subscription_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="">Select plan</option>
                {subscriptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleEdit}
              className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              Save Changes
            </button>
            <button onClick={() => setShowEditModal(false)}
              className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal title="Delete Company" onClose={() => setShowDeleteModal(false)}>
          <p className="font-body text-sm text-gray-600 mb-6">
            Are you sure you want to delete <span className="font-semibold text-gray-800">{selectedCompany?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={handleDelete}
              className="font-display flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              Delete
            </button>
            <button onClick={() => setShowDeleteModal(false)}
              className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Companies