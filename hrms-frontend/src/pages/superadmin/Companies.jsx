import { useState, useEffect } from 'react'
import {
  getCompanies, updateCompany, deleteCompany, getSubscriptions, suspendCompany
} from '../../services/superadminService'
import { createClient } from '../../services/superadminService'
import api from '../../services/api'

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

const FEATURE_LABELS = {
  employees: 'Employees', holidays: 'Holidays', policies: 'Policies',
  expenses: 'Expenses (mo)', salary_payslips: 'Payslips (mo)',
  letters: 'Letters (mo)', messaging: 'Messages (mo)', shifts: 'Shifts',
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

  const [expandedCompanyId, setExpandedCompanyId] = useState(null)
  const [usageData, setUsageData] = useState({})
  const [usageLoading, setUsageLoading] = useState({})

  const [addForm, setAddForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', password: '', company_name: ''
  })
  const [addError, setAddError] = useState('')

  const [editForm, setEditForm] = useState({
    name: '', email: '', phone: '', subscription_id: '', is_active: true
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [companiesRes, subsRes] = await Promise.all([getCompanies(), getSubscriptions()])
      setCompanies(companiesRes.data.data)
      setSubscriptions(subsRes.data.data)
    } catch {
      setError('Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  // Toggle inline usage expansion — fetches once and caches per company
  const toggleExpand = async (companyId) => {
    if (expandedCompanyId === companyId) {
      setExpandedCompanyId(null)
      return
    }
    setExpandedCompanyId(companyId)
    if (usageData[companyId]) return
    setUsageLoading(p => ({ ...p, [companyId]: true }))
    try {
      const res = await api.get(`/superadmin/companies/${companyId}/usage`)
      if (res.data.success) setUsageData(p => ({ ...p, [companyId]: res.data.data }))
    } catch { /* silent */ }
    finally { setUsageLoading(p => ({ ...p, [companyId]: false })) }
  }

  // Returns true if any feature in cached usage is at or above 90% — used for amber row indicator
  const hasUsageWarning = (companyId) => {
    const data = usageData[companyId]
    if (!data?.features) return false
    return Object.values(data.features).some(f => f.enabled && f.warning)
  }

  const filtered = companies.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const openEdit = (company) => {
    setSelectedCompany(company)
    setEditForm({
      name: company.name || '',
      email: company.email || '',
      phone: company.phone || '',
      subscription_id: company.subscription_id || '',
      is_active: company.is_active !== false
    })
    setShowEditModal(true)
  }

  const handleAdd = async () => {
    setAddError('')
    if (!addForm.company_name || !addForm.first_name || !addForm.email || !addForm.password) {
      setAddError('Company name, contact name, email and password are required')
      return
    }
    if (addForm.password.length < 8) {
      setAddError('Password must be at least 8 characters')
      return
    }
    try {
      setActionLoading('add')
      await createClient(addForm)
      setShowAddModal(false)
      setAddForm({ first_name: '', last_name: '', email: '', phone: '', password: '', company_name: '' })
      fetchData()
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to create company')
    } finally { setActionLoading(null) }
  }

  const handleEdit = async () => {
    try {
      setActionLoading('edit')
      await updateCompany(selectedCompany.id, editForm)
      setShowEditModal(false)
      fetchData()
    } catch {
      setError('Failed to update company')
    } finally { setActionLoading(null) }
  }

  const handleDelete = async () => {
    try {
      setActionLoading('delete')
      await deleteCompany(selectedCompany.id)
      setShowDeleteModal(false)
      fetchData()
    } catch {
      setError('Failed to delete company')
    } finally { setActionLoading(null) }
  }

  const handleSuspend = async (company) => {
    try {
      setActionLoading(company.id)
      const action = company.status === 'suspended' ? 'activate' : 'suspend'
      await suspendCompany(company.id, action)
      fetchData()
    } catch {
      setError('Failed to update company status')
    } finally { setActionLoading(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
                <>
                  <tr key={company.id}
                    className={`border-b border-gray-50 transition
                      ${expandedCompanyId === company.id ? 'bg-amber-50/30' : 'hover:bg-gray-50'}
                      ${hasUsageWarning(company.id) ? 'border-l-2 border-l-amber-400' : ''}`}>
                    <td className="font-body px-4 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-display text-sm font-medium text-gray-800">{company.name}</p>
                          <p className="font-body text-xs text-gray-400">{company.email}</p>
                        </div>
                        {hasUsageWarning(company.id) && (
                          <span className="font-display text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                            Near limit
                          </span>
                        )}
                      </div>
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
                        <button onClick={() => toggleExpand(company.id)}
                          className={`font-display text-xs font-semibold hover:underline ${expandedCompanyId === company.id ? 'text-gray-400' : 'text-primary'}`}>
                          {expandedCompanyId === company.id ? 'Hide' : 'Usage'}
                        </button>
                        <span className="text-gray-300">|</span>
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

                  {/* Inline usage expansion row */}
                  {expandedCompanyId === company.id && (
                    <tr key={`usage-${company.id}`}>
                      <td colSpan="9" className="px-0 py-0 border-b border-gray-100">
                        <div className="bg-amber-50/40 border-t border-amber-100 px-8 py-5">
                          {usageLoading[company.id] ? (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              Loading usage...
                            </div>
                          ) : usageData[company.id] ? (
                            <div>
                              <p className="font-display text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
                                Plan Usage — {usageData[company.id].plan_name}
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {Object.entries(usageData[company.id].features || {}).map(([key, feat]) => {
                                  if (!feat.enabled || feat.limit === null || feat.used === null) return null
                                  const label = FEATURE_LABELS[key]
                                  if (!label) return null
                                  const pct = feat.limit > 0 ? Math.min(Math.round((feat.used / feat.limit) * 100), 100) : 0
                                  const isFull = feat.used >= feat.limit
                                  return (
                                    <div key={key} className={`bg-white rounded-xl px-4 py-3 border
                                      ${isFull ? 'border-red-200' : feat.warning ? 'border-amber-200' : 'border-gray-100'}`}>
                                      <div className="flex justify-between items-center mb-1.5">
                                        <span className="font-display text-xs font-semibold text-gray-600">{label}</span>
                                        {isFull ? (
                                          <span className="font-display text-xs font-bold text-red-500">Full</span>
                                        ) : feat.warning ? (
                                          <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                          </svg>
                                        ) : null}
                                      </div>
                                      <p className={`font-display text-base font-bold
                                        ${isFull ? 'text-red-600' : feat.warning ? 'text-amber-600' : 'text-gray-800'}`}>
                                        {feat.used} <span className="text-xs font-normal text-gray-400">/ {feat.limit}</span>
                                      </p>
                                      <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                        <div className={`h-full rounded-full
                                          ${isFull ? 'bg-red-400' : feat.warning ? 'bg-amber-400' : 'bg-amber-300'}`}
                                          style={{ width: `${pct}%` }} />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="font-body text-sm text-gray-400">No usage data — company may have no active plan.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-100">
          <p className="font-body text-xs text-gray-400">Showing {filtered.length} of {companies.length} companies</p>
        </div>
      </div>

      {/* Add Company Modal */}
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
            <button onClick={handleAdd} disabled={actionLoading === 'add'}
              className="font-display flex-1 bg-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              {actionLoading === 'add' ? 'Creating...' : 'Create Company'}
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
            <button onClick={handleEdit} disabled={actionLoading === 'edit'}
              className="font-display flex-1 bg-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              {actionLoading === 'edit' ? 'Saving...' : 'Save Changes'}
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
            Are you sure you want to delete <span className="font-semibold text-gray-800">{selectedCompany?.name}</span>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={actionLoading === 'delete'}
              className="font-display flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
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