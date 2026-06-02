import { useState, useEffect } from 'react'
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, toggleDepartmentStatus, getDesignations, createDesignation, updateDesignation, deleteDesignation, toggleDesignationStatus } from '../../services/managerService'

function Badge({ status }) {
  const styles = { 'Active': 'bg-green-50 text-green-600', 'Inactive': 'bg-red-50 text-red-500' }
  return <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-display text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function DepartmentDesignations() {
  const [activeTab, setActiveTab] = useState('departments')
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  
  const [formData, setFormData] = useState({ name: '', default_salary: '', expected_working_hours: '' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [deptRes, desigRes] = await Promise.all([getDepartments(), getDesignations()])
      setDepartments(deptRes.data.data)
      setDesignations(desigRes.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    try {
      if (activeTab === 'departments') {
        await createDepartment(formData)
      } else {
        await createDesignation(formData)
      }
      setShowAddModal(false)
      setFormData({ name: '', default_salary: '', expected_working_hours: '' })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleEdit = async () => {
    try {
      if (activeTab === 'departments') {
        await updateDepartment(selectedItem.id, formData)
      } else {
        await updateDesignation(selectedItem.id, formData)
      }
      setShowEditModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    try {
      if (activeTab === 'departments') {
        await deleteDepartment(selectedItem.id)
      } else {
        await deleteDesignation(selectedItem.id)
      }
      setShowDeleteModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleStatus = async (item) => {
    try {
      if (activeTab === 'departments') {
        await toggleDepartmentStatus(item.id, { is_active: !item.is_active })
      } else {
        await toggleDesignationStatus(item.id, { is_active: !item.is_active })
      }
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const activeData = activeTab === 'departments' ? departments : designations
  const filtered = activeData.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="flex items-center justify-center h-64"><p className="font-body text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Organization Setup</h1>
          <p className="font-body text-sm text-gray-400 mt-1">Manage departments and roles for your company</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="font-display bg-primary hover:opacity-90 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
          + Add {activeTab === 'departments' ? 'Department' : 'Role'}
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[['departments', 'Departments'], ['designations', 'Roles']].map(([key, label]) => (
          <button key={key} onClick={() => { setActiveTab(key); setSearch(''); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${activeTab}...`}
          className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {filtered.length === 0 ? (
            <div className="p-10 text-center"><p className="text-gray-400 text-sm">No {activeTab} found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                    <th className="font-display text-left px-6 py-3 font-medium">#</th>
                    <th className="font-display text-left px-6 py-3 font-medium">Name</th>
                    {activeTab === 'designations' && (
                      <>
                        <th className="font-display text-left px-6 py-3 font-medium">Base Salary</th>
                        <th className="font-display text-left px-6 py-3 font-medium">Contracted Working Hours</th>
                      </>
                    )}
                    <th className="font-display text-left px-6 py-3 font-medium">Created On</th>
                    <th className="font-display text-left px-6 py-3 font-medium">Status</th>
                    <th className="font-display text-left px-6 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-display text-sm font-medium text-gray-800">{item.name}</p>
                      </td>
                      {activeTab === 'designations' && (
                        <>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            ₹{Number(item.default_salary || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {item.expected_working_hours || 8} hrs/day
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={item.is_active ? 'Active' : 'Inactive'} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => { 
                            setSelectedItem(item); 
                            setFormData({ name: item.name, default_salary: item.default_salary || '', expected_working_hours: item.expected_working_hours || '' }); 
                            setShowEditModal(true);
                          }} className="text-xs text-primary hover:underline font-medium">Edit</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => handleToggleStatus(item)}
                            className={`text-xs font-medium hover:underline ${item.is_active ? 'text-yellow-500' : 'text-green-600'}`}>
                            {item.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true) }}
                            className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <Modal title={`Add New ${activeTab === 'departments' ? 'Department' : 'Role'}`} onClose={() => setShowAddModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={`e.g. ${activeTab === 'departments' ? 'Engineering' : 'Software Engineer'}`}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            {activeTab === 'designations' && (
              <>
                <div>
                  <label className="font-display block text-sm font-medium text-gray-700 mb-1">Base Salary (₹)</label>
                  <input name="default_salary" type="number" value={formData.default_salary} onChange={e => setFormData({ ...formData, default_salary: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="font-display block text-sm font-medium text-gray-700 mb-1">Contracted Working Hours (Daily)</label>
                  <input name="expected_working_hours" type="number" value={formData.expected_working_hours} onChange={e => setFormData({ ...formData, expected_working_hours: e.target.value })}
                    placeholder="e.g. 8"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleAdd} className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition">Add</button>
            <button onClick={() => setShowAddModal(false)} className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {showEditModal && (
        <Modal title={`Edit ${activeTab === 'departments' ? 'Department' : 'Role'}`} onClose={() => setShowEditModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            {activeTab === 'designations' && (
              <>
                <div>
                  <label className="font-display block text-sm font-medium text-gray-700 mb-1">Base Salary (₹)</label>
                  <input name="default_salary" type="number" value={formData.default_salary} onChange={e => setFormData({ ...formData, default_salary: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="font-display block text-sm font-medium text-gray-700 mb-1">Contracted Working Hours (Daily)</label>
                  <input name="expected_working_hours" type="number" value={formData.expected_working_hours} onChange={e => setFormData({ ...formData, expected_working_hours: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleEdit} className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition">Save Changes</button>
            <button onClick={() => setShowEditModal(false)} className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal title={`Delete ${activeTab === 'departments' ? 'Department' : 'Role'}`} onClose={() => setShowDeleteModal(false)}>
          <p className="font-body text-sm text-gray-600">Are you sure you want to delete <span className="font-semibold text-gray-800">{selectedItem?.name}</span>?</p>
          <div className="flex gap-3 mt-6">
            <button onClick={handleDelete} className="font-display flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Delete</button>
            <button onClick={() => setShowDeleteModal(false)} className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default DepartmentDesignations
