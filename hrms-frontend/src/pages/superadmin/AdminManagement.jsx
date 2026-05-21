import { useState, useEffect } from 'react'
import { getAdmins, getManagers, createAdmin, createManager, deleteUser, activateUser, getCompanies } from '../../services/superadminService'

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

function StatusBadge({ isActive }) {
  return (
    <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function AdminManagement() {
  const [activeTab, setActiveTab] = useState('admins')
  const [admins, setAdmins] = useState([])
  const [managers, setManagers] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddAdminModal, setShowAddAdminModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [error, setError] = useState('')
  const [adminForm, setAdminForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' })
  const [managerForm, setManagerForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', company_id: '', designation: '', department: '' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [adminsRes, managersRes, companiesRes] = await Promise.all([
        getAdmins(), getManagers(), getCompanies()
      ])
      setAdmins(adminsRes.data.data)
      setManagers(managersRes.data.data)
      setCompanies(companiesRes.data.data)
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    try {
      setError('')
      await createAdmin(adminForm)
      setShowAddAdminModal(false)
      setAdminForm({ first_name: '', last_name: '', email: '', phone: '', password: '' })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add admin')
    }
  }

  const handleAddManager = async () => {
    try {
      setError('')
      await createManager(managerForm)
      setShowAddManagerModal(false)
      setManagerForm({ first_name: '', last_name: '', email: '', phone: '', password: '', company_id: '', designation: '', department: '' })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add manager')
    }
  }

  const openConfirm = (item, action) => {
    setSelectedItem(item)
    setConfirmAction(action)
    setShowConfirmModal(true)
  }

  const handleConfirmAction = async () => {
    try {
      if (confirmAction === 'deactivate') {
        await deleteUser(selectedItem.id)
      } else {
        await activateUser(selectedItem.id)
      }
      setShowConfirmModal(false)
      fetchData()
    } catch (err) {
      setError('Failed to update user status')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="font-body text-gray-400">Loading...</p></div>

  const activeAdmins = admins.filter(a => a.is_active).length
  const activeManagers = managers.filter(m => m.is_active).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Admin Management</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Manage super admins and company managers</p>
      </div>

      {error && (
        <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="font-display text-red-400 hover:text-red-600 font-bold ml-4">×</button>
        </div>
      )}

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {['admins', 'managers'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`font-display px-5 py-2 rounded-lg text-sm font-medium transition
              ${activeTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'admins' ? `Super Admins (${activeAdmins} active)` : `Managers (${activeManagers} active)`}
          </button>
        ))}
      </div>

      {/* Super Admins Table */}
      {activeTab === 'admins' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-gray-800">Super Admins ({admins.length})</h2>
            <button onClick={() => setShowAddAdminModal(true)}
              className="font-display bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              + Add Super Admin
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="font-display text-left px-6 py-3 font-medium">#</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Name</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Email</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Phone</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Joined</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Status</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin, index) => (
                  <tr key={admin.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${!admin.is_active ? 'opacity-60' : ''}`}>
                    <td className="font-body px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="font-display px-6 py-4 text-sm font-medium text-gray-800">{admin.first_name} {admin.last_name}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{admin.email}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{admin.phone}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-400">{new Date(admin.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4"><StatusBadge isActive={admin.is_active} /></td>
                    <td className="px-6 py-4">
                      {admin.is_active ? (
                        activeAdmins > 1 && (
                          <button onClick={() => openConfirm(admin, 'deactivate')}
                            className="font-display text-xs text-red-500 hover:underline font-medium">
                            Deactivate
                          </button>
                        )
                      ) : (
                        <button onClick={() => openConfirm(admin, 'activate')}
                          className="font-display text-xs text-green-600 hover:underline font-medium">
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Managers Table */}
      {activeTab === 'managers' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-gray-800">Managers ({managers.length})</h2>
            <span className="font-body text-xs text-gray-400">Managed by company clients</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="font-display text-left px-6 py-3 font-medium">#</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Name</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Email</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Phone</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Company</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Joined</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Status</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {managers.length === 0 ? (
                  <tr><td colSpan="8" className="font-body text-center py-8 text-sm text-gray-400">No managers yet</td></tr>
                ) : (
                  managers.map((manager, index) => (
                    <tr key={manager.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${!manager.is_active ? 'opacity-60' : ''}`}>
                      <td className="font-body px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                      <td className="font-display px-6 py-4 text-sm font-medium text-gray-800">{manager.first_name} {manager.last_name}</td>
                      <td className="font-body px-6 py-4 text-sm text-gray-500">{manager.email}</td>
                      <td className="font-body px-6 py-4 text-sm text-gray-500">{manager.phone}</td>
                      <td className="font-body px-6 py-4 text-sm text-gray-500">{manager.company_name || '—'}</td>
                      <td className="font-body px-6 py-4 text-sm text-gray-400">{new Date(manager.created_at).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4"><StatusBadge isActive={manager.is_active} /></td>
                      <td className="px-6 py-4">
                        {manager.is_active ? (
                          <button onClick={() => openConfirm(manager, 'deactivate')}
                            className="font-display text-xs text-red-500 hover:underline font-medium">
                            Deactivate
                          </button>
                        ) : (
                          <button onClick={() => openConfirm(manager, 'activate')}
                            className="font-display text-xs text-green-600 hover:underline font-medium">
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Super Admin Modal */}
      {showAddAdminModal && (
        <Modal title="Add New Super Admin" onClose={() => setShowAddAdminModal(false)}>
          <div className="space-y-4">
            {[['first_name','First Name'],['last_name','Last Name'],['email','Email'],['phone','Phone']].map(([name, label]) => (
              <div key={name}>
                <label className="font-display block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input name={name} value={adminForm[name]} onChange={e => setAdminForm({...adminForm, [e.target.name]: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            ))}
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input name="password" type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleAddAdmin} className="font-display flex-1 bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold py-2.5 rounded-lg transition">Add Super Admin</button>
            <button onClick={() => setShowAddAdminModal(false)} className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && selectedItem && (
        <Modal title={confirmAction === 'deactivate' ? 'Deactivate Account' : 'Activate Account'} onClose={() => setShowConfirmModal(false)}>
          <p className="font-body text-sm text-gray-600">
            {confirmAction === 'deactivate'
              ? <>Are you sure you want to deactivate <span className="font-display font-semibold text-gray-800">{selectedItem.first_name} {selectedItem.last_name}</span>? They will lose login access immediately.</>
              : <>Reactivate <span className="font-display font-semibold text-gray-800">{selectedItem.first_name} {selectedItem.last_name}</span>? They will regain full login access.</>
            }
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={handleConfirmAction}
              className={`font-display flex-1 text-white text-sm font-semibold py-2.5 rounded-lg transition ${confirmAction === 'deactivate' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
              {confirmAction === 'deactivate' ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={() => setShowConfirmModal(false)} className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AdminManagement