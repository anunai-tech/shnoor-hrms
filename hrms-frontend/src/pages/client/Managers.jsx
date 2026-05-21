import { useState, useEffect } from 'react'
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

function Staff() {
  const [activeTab, setActiveTab] = useState('managers')
  const [managers, setManagers] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [toggleLoading, setToggleLoading] = useState(null)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', password: '', designation: '', department: ''
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [mgrRes, empRes] = await Promise.all([
        api.get('/client/managers'),
        api.get('/client/employees')
      ])
      setManagers(mgrRes.data.data)
      setEmployees(empRes.data.data)
    } catch {
      setError('Failed to load staff data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setFormError('')
    if (!form.first_name || !form.email || !form.password) {
      setFormError('First name, email and password are required')
      return
    }
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters')
      return
    }
    try {
      await api.post('/client/managers', form)
      setShowModal(false)
      setForm({ first_name: '', last_name: '', email: '', phone: '', password: '', designation: '', department: '' })
      fetchAll()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create manager')
    }
  }

  const handleToggle = async (manager) => {
    setToggleLoading(manager.id)
    try {
      await api.put(`/client/managers/${manager.id}/toggle`)
      fetchAll()
    } catch {
      setError('Failed to update manager status')
    } finally {
      setToggleLoading(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="font-body text-gray-400 text-sm">Loading staff...</p>
    </div>
  )

  const activeManagers = managers.filter(m => m.is_active).length
  const activeEmployees = employees.filter(e => e.is_active).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Staff</h1>
        <p className="font-body text-sm text-gray-500 mt-1">Manage your company's managers and view employees</p>
      </div>

      {error && (
        <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 flex justify-between">
          {error}
          <button onClick={() => setError('')} className="font-bold ml-4">×</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-body text-xs text-gray-400 uppercase tracking-wide mb-1">Total Managers</p>
          <p className="font-display text-3xl font-bold text-gray-800">{managers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-body text-xs text-gray-400 uppercase tracking-wide mb-1">Active Managers</p>
          <p className="font-display text-3xl font-bold text-green-600">{activeManagers}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-body text-xs text-gray-400 uppercase tracking-wide mb-1">Total Employees</p>
          <p className="font-display text-3xl font-bold text-gray-800">{employees.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-body text-xs text-gray-400 uppercase tracking-wide mb-1">Active Employees</p>
          <p className="font-display text-3xl font-bold text-green-600">{activeEmployees}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'managers', label: `Managers (${managers.length})` },
          { key: 'employees', label: `Employees (${employees.length})` }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`font-display px-5 py-2 rounded-lg text-sm font-medium transition
              ${activeTab === tab.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Managers Tab */}
      {activeTab === 'managers' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-gray-800">All Managers</h2>
            <button onClick={() => setShowModal(true)}
              className="font-display bg-primary hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              + Add Manager
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  {['#', 'Name', 'Email', 'Phone', 'Designation', 'Department', 'Status', 'Actions'].map(h => (
                    <th key={h} className="font-display text-left px-6 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {managers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="font-body text-center py-14 text-sm text-gray-400">
                      No managers yet. Add your first manager to get started.
                    </td>
                  </tr>
                ) : managers.map((m, i) => (
                  <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${!m.is_active ? 'opacity-60' : ''}`}>
                    <td className="font-body px-6 py-4 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <span className="font-display text-xs font-bold text-primary">{m.first_name?.charAt(0)}</span>
                        </div>
                        <p className="font-display text-sm font-medium text-gray-800">{m.first_name} {m.last_name}</p>
                      </div>
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{m.email}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{m.phone || '—'}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{m.designation || '—'}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{m.department || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`font-display text-xs font-medium px-2.5 py-1 rounded-full ${m.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleToggle(m)} disabled={toggleLoading === m.id}
                        className={`font-display text-xs font-medium hover:underline disabled:opacity-50 ${m.is_active ? 'text-red-500' : 'text-green-600'}`}>
                        {toggleLoading === m.id ? '...' : m.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employees Tab — Read Only */}
      {activeTab === 'employees' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-gray-800">All Employees</h2>
            <span className="font-body text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
              Managed by your team's managers
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  {['#', 'Name', 'Email', 'Phone', 'Designation', 'Department', 'Joined', 'Status'].map(h => (
                    <th key={h} className="font-display text-left px-6 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="font-body text-center py-14 text-sm text-gray-400">
                      No employees yet. Employees are added by your managers.
                    </td>
                  </tr>
                ) : employees.map((e, i) => (
                  <tr key={e.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${!e.is_active ? 'opacity-60' : ''}`}>
                    <td className="font-body px-6 py-4 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <span className="font-display text-xs font-bold text-blue-400">{e.first_name?.charAt(0)}</span>
                        </div>
                        <p className="font-display text-sm font-medium text-gray-800">{e.first_name} {e.last_name}</p>
                      </div>
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{e.email}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{e.phone || '—'}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{e.designation || '—'}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{e.department || '—'}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">
                      {e.joining_date ? new Date(e.joining_date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-display text-xs font-medium px-2.5 py-1 rounded-full ${e.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {e.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Manager Modal */}
      {showModal && (
        <Modal title="Add New Manager" onClose={() => { setShowModal(false); setFormError('') }}>
          <div className="space-y-4">
            {[
              ['first_name', 'First Name *', 'text', 'John'],
              ['last_name', 'Last Name', 'text', 'Doe'],
              ['email', 'Work Email *', 'email', 'john@company.com'],
              ['phone', 'Phone Number', 'tel', '+91 98765 43210'],
              ['designation', 'Designation', 'text', 'HR Manager'],
              ['department', 'Department', 'text', 'Human Resources'],
            ].map(([name, label, type, placeholder]) => (
              <div key={name}>
                <label className="font-display block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type={type} value={form[name]}
                  onChange={e => setForm(prev => ({ ...prev, [name]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition" />
              </div>
            ))}
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Min. 8 characters"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition" />
            </div>
          </div>
          {formError && <p className="font-body text-sm text-red-600 mt-4">{formError}</p>}
          <div className="flex gap-3 mt-6">
            <button onClick={handleCreate}
              className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              Add Manager
            </button>
            <button onClick={() => { setShowModal(false); setFormError('') }}
              className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Staff