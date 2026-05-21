import { useState, useEffect } from 'react'
import { getClients, createClient, getCompanyManagers } from '../../services/superadminService'

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

function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [expandedClient, setExpandedClient] = useState(null)
  const [managersMap, setManagersMap] = useState({})
  const [managersLoading, setManagersLoading] = useState(null)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', password: '', company_name: ''
  })

  useEffect(() => { fetchClients() }, [])

  const toggleManagers = async (client) => {
    if (expandedClient === client.id) {
      setExpandedClient(null)
      return
    }
    setExpandedClient(client.id)
    if (managersMap[client.company_id]) return // already fetched
    setManagersLoading(client.id)
    try {
      const res = await getCompanyManagers(client.company_id)
      setManagersMap(prev => ({ ...prev, [client.company_id]: res.data.data }))
    } catch {
      setManagersMap(prev => ({ ...prev, [client.company_id]: [] }))
    } finally {
      setManagersLoading(null)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await getClients()
      setClients(res.data.data)
    } catch {
      setError('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setFormError('')
    if (!form.first_name || !form.email || !form.password || !form.company_name) {
      setFormError('First name, email, password and company name are required')
      return
    }
    try {
      await createClient(form)
      setShowModal(false)
      setForm({ first_name: '', last_name: '', email: '', phone: '', password: '', company_name: '' })
      fetchClients()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create client')
    }
  }

  const statusColors = {
    active: 'bg-green-50 text-green-600',
    pending: 'bg-yellow-50 text-yellow-600',
    suspended: 'bg-red-50 text-red-500'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="font-body text-gray-400">Loading clients...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Clients</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Companies registered on SHNOOR HRMS</p>
      </div>

      {error && (
        <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-gray-800">All Clients ({clients.length})</h2>
          <button
            onClick={() => setShowModal(true)}
            className="font-display bg-primary hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Add Client
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                {['#', 'Client', 'Company', 'Subdomain', 'Portal Status', 'Joined', ''].map(h => (
                  <th key={h} className="font-display text-left px-6 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="font-body text-center py-12 text-sm text-gray-400">
                    No clients yet. Add your first client above.
                  </td>
                </tr>
              ) : (
                clients.map((client, index) => (
                  <>
                    <tr key={client.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => toggleManagers(client)}>
                      <td className="font-body px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-display text-sm font-medium text-gray-800">
                          {client.first_name} {client.last_name}
                        </p>
                        <p className="font-body text-xs text-gray-400">{client.email}</p>
                      </td>
                      <td className="font-body px-6 py-4 text-sm text-gray-600">{client.company_name || '—'}</td>
                      <td className="font-body px-6 py-4 text-sm text-gray-600">
                        {client.subdomain ? (
                          <span className="font-semibold text-primary">{client.subdomain}.shnoor.com</span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-display text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColors[client.company_status] || 'bg-gray-100 text-gray-500'}`}>
                          {client.company_status || 'pending'}
                        </span>
                      </td>
                      <td className="font-body px-6 py-4 text-sm text-gray-400">
                        {new Date(client.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4">
                        <button className="font-display text-xs text-gray-400 hover:text-primary">
                          {expandedClient === client.id ? '▲ Hide' : '▼ Managers'}
                        </button>
                      </td>
                    </tr>
                    {expandedClient === client.id && (
                      <tr key={`managers-${client.id}`} className="bg-gray-50">
                        <td colSpan="8" className="px-8 py-4">
                          {managersLoading === client.id ? (
                            <p className="font-body text-sm text-gray-400">Loading managers...</p>
                          ) : (managersMap[client.company_id] || []).length === 0 ? (
                            <p className="font-body text-sm text-gray-400">No managers added yet.</p>
                          ) : (
                            <div className="space-y-2">
                              <p className="font-display text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Managers of {client.company_name}
                              </p>
                              {(managersMap[client.company_id] || []).map(mgr => (
                                <div key={mgr.id} className="flex items-center gap-4 bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <span className="font-display text-xs font-bold text-primary">{mgr.first_name?.charAt(0)}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-display text-sm font-medium text-gray-800">{mgr.first_name} {mgr.last_name}</p>
                                    <p className="font-body text-xs text-gray-400 truncate">{mgr.email}</p>
                                  </div>
                                  <span className={`font-display text-xs px-2 py-0.5 rounded-full ${mgr.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                    {mgr.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                  <span className="font-body text-xs text-gray-400">{mgr.designation || '—'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title="Add New Client" onClose={() => { setShowModal(false); setFormError('') }}>
          <div className="space-y-4">
            {[
              ['company_name', 'Company Name', 'text', 'Acme Corp'],
              ['first_name', 'Contact First Name', 'text', 'John'],
              ['last_name', 'Contact Last Name', 'text', 'Doe'],
              ['email', 'Email Address', 'email', 'john@acmecorp.com'],
              ['phone', 'Phone Number', 'tel', '+91 98765 43210'],
              ['password', 'Temporary Password', 'password', 'Min. 8 characters'],
            ].map(([name, label, type, placeholder]) => (
              <div key={name}>
                <label className="font-display block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[name]}
                  onChange={e => setForm(prev => ({ ...prev, [name]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                />
              </div>
            ))}
          </div>

          {formError && (
            <p className="font-body text-sm text-red-600 mt-4">{formError}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCreate}
              className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition"
            >
              Create Client
            </button>
            <button
              onClick={() => { setShowModal(false); setFormError('') }}
              className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Clients