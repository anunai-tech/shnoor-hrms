import { useState, useEffect } from 'react'
import { getAdmins, getManagers, createAdmin, createManager, deleteUser, getCompanies } from '../../services/superadminService'

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

function AdminManagement() {
  const [activeTab, setActiveTab] = useState('admins')
  const [admins, setAdmins] = useState([])
  const [managers, setManagers] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddAdminModal, setShowAddAdminModal] = useState(false)
  const [showAddManagerModal, setShowAddManagerModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [deleteType, setDeleteType] = useState('')
  const [error, setError] = useState('')
  const [adminForm, setAdminForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' })
  const [managerForm, setManagerForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', company_id: '' })

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
      await createManager(managerForm)
      setShowAddManagerModal(false)
      setManagerForm({ first_name: '', last_name: '', email: '', phone: '', password: '', company_id: '' })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add manager')
    }
  }

  const openDelete = (item, type) => {
    setSelectedItem(item)
    setDeleteType(type)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    try {
      await deleteUser(selectedItem.id)
      setShowDeleteModal(false)
      fetchData()
    } catch (err) {
      setError('Failed to remove user')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Admin Management</h1>
        <p className="text-sm text-gray-400 mt-1">Manage super admins and company managers</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {['admins', 'managers'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition
              ${activeTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'admins' ? 'Super Admins' : 'Managers'}
          </button>
        ))}
      </div>

      {activeTab === 'admins' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Super Admins ({admins.length})</h2>
            <button onClick={() => setShowAddAdminModal(true)}
              className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              + Add Super Admin
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium">#</th>
                  <th className="text-left px-6 py-3 font-medium">Name</th>
                  <th className="text-left px-6 py-3 font-medium">Email</th>
                  <th className="text-left px-6 py-3 font-medium">Phone</th>
                  <th className="text-left px-6 py-3 font-medium">Joined</th>
                  <th className="text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin, index) => (
                  <tr key={admin.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{admin.first_name} {admin.last_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{admin.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{admin.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(admin.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4">
                      {admins.length > 1 && (
                        <button onClick={() => openDelete(admin, 'admin')}
                          className="text-xs text-red-500 hover:underline font-medium">Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'managers' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Managers ({managers.length})</h2>
            <button onClick={() => setShowAddManagerModal(true)}
              className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              + Add Manager
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium">#</th>
                  <th className="text-left px-6 py-3 font-medium">Name</th>
                  <th className="text-left px-6 py-3 font-medium">Email</th>
                  <th className="text-left px-6 py-3 font-medium">Phone</th>
                  <th className="text-left px-6 py-3 font-medium">Company</th>
                  <th className="text-left px-6 py-3 font-medium">Joined</th>
                  <th className="text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {managers.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-8 text-sm text-gray-400">No managers yet</td></tr>
                ) : (
                  managers.map((manager, index) => (
                    <tr key={manager.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{manager.first_name} {manager.last_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{manager.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{manager.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{manager.company_name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{new Date(manager.created_at).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => openDelete(manager, 'manager')}
                          className="text-xs text-red-500 hover:underline font-medium">Remove</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddAdminModal && (
        <Modal title="Add New Super Admin" onClose={() => setShowAddAdminModal(false)}>
          <div className="space-y-4">
            {[['first_name','First Name'],['last_name','Last Name'],['email','Email'],['phone','Phone']].map(([name, label]) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input name={name} value={adminForm[name]} onChange={e => setAdminForm({...adminForm, [e.target.name]: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input name="password" type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleAddAdmin} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold py-2.5 rounded-lg transition">Add Super Admin</button>
            <button onClick={() => setShowAddAdminModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {showAddManagerModal && (
        <Modal title="Add New Manager" onClose={() => setShowAddManagerModal(false)}>
          <div className="space-y-4">
            {[['first_name','First Name'],['last_name','Last Name'],['email','Email'],['phone','Phone']].map(([name, label]) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input name={name} value={managerForm[name]} onChange={e => setManagerForm({...managerForm, [e.target.name]: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input name="password" type="password" value={managerForm.password} onChange={e => setManagerForm({...managerForm, password: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Company</label>
              <select name="company_id" value={managerForm.company_id} onChange={e => setManagerForm({...managerForm, company_id: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="">Select a company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleAddManager} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold py-2.5 rounded-lg transition">Add Manager</button>
            <button onClick={() => setShowAddManagerModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal title="Remove Access" onClose={() => setShowDeleteModal(false)}>
          <p className="text-sm text-gray-600">
            Are you sure you want to remove <span className="font-semibold text-gray-800">{selectedItem?.first_name} {selectedItem?.last_name}</span>? They will lose access immediately.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Remove</button>
            <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AdminManagement