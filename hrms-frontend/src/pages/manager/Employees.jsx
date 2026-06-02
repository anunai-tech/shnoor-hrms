import { useState, useEffect } from 'react'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../services/managerService'
import api from '../../services/api'

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

// Reusable avatar — shows photo if available, falls back to initial
function Avatar({ emp, size = 'sm' }) {
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-8 h-8 text-xs'
  if (emp?.profile_photo) {
    return (
      <img src={emp.profile_photo} alt={emp.first_name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`} />
    )
  }
  return (
    <div className={`${sizeClass} bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0`}>
      <span className="text-primary font-bold">{emp?.first_name?.charAt(0)}</span>
    </div>
  )
}

function Employees() {

  const [employees, setEmployees] = useState([])
  const [managers, setManagers] = useState([])
  const [shifts, setShifts] = useState([])
  const [activeTab, setActiveTab] = useState('employees')
  const [search, setSearch] = useState('')
  const [managerSearch, setManagerSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [editTarget, setEditTarget] = useState(null) // 'employee' | 'manager'
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    department: '', designation: '', joining_date: '', password: '', shift_id: ''
  })
  const [editData, setEditData] = useState({
    first_name: '', last_name: '', phone: '',
    department: '', designation: '', joining_date: '', is_active: true
  })

  useEffect(() => {
    fetchAll()
    api.get('/manager/shifts').then(r => { if (r.data.success) setShifts(r.data.data) }).catch(() => { })
  }, [])

  const fetchAll = async () => {
    try {
      const [empRes, mgrRes] = await Promise.all([
        getEmployees(),
        api.get('/manager/managers')
      ])
      setEmployees(empRes.data.data)
      setManagers(mgrRes.data.data)
    } catch (err) {
      setError('Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = fetchAll

  const filtered = employees.filter(e =>
    `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredManagers = managers.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(managerSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(managerSearch.toLowerCase()) ||
    (m.department || '').toLowerCase().includes(managerSearch.toLowerCase())
  )

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleAdd = async () => {
    try {
      await createEmployee(formData)
      setShowAddModal(false)
      setFormData({ first_name: '', last_name: '', email: '', phone: '', department: '', designation: '', joining_date: '', password: '', shift_id: '' })
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add employee')
    }
  }

  const openEdit = (person, type) => {
    setEditTarget(type)
    setSelectedEmployee(person)
    setEditData({
      first_name: person.first_name || '',
      last_name: person.last_name || '',
      phone: person.phone || '',
      department: person.department || '',
      designation: person.designation || '',
      joining_date: person.joining_date ? String(person.joining_date).substring(0, 10) : '',
      is_active: person.is_active,
    })
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    try {
      if (editTarget === 'manager') {
        await api.put(`/manager/managers/${selectedEmployee.id}`, editData)
      } else {
        await updateEmployee(selectedEmployee.id, editData)
      }
      setShowEditModal(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save changes')
    }
  }

  const toggleStatus = async (person, type) => {
    try {
      if (type === 'manager') {
        await api.put(`/manager/managers/${person.id}`, { ...person, is_active: !person.is_active })
      } else {
        await updateEmployee(person.id, { ...person, is_active: !person.is_active })
      }
      fetchAll()
    } catch (err) {
      setError('Failed to update status')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteEmployee(selectedEmployee.id)
      setShowDeleteModal(false)
      fetchEmployees()
    } catch (err) {
      setError('Failed to delete employee')
    }
  }

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-display block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input name="first_name" value={formData.first_name} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="font-display block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input name="last_name" value={formData.last_name} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div>
        <label className="font-display block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input name="email" value={formData.email} onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label className="font-display block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input name="phone" value={formData.phone} onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-display block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input name="department" value={formData.department} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="font-display block text-sm font-medium text-gray-700 mb-1">Designation</label>
          <input name="designation" value={formData.designation} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div>
        <label className="font-display block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
        <input name="joining_date" type="date" value={formData.joining_date} onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label className="font-display block text-sm font-medium text-gray-700 mb-1">Shift</label>
        <select name="shift_id" value={formData.shift_id} onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">Default Shift</option>
          {shifts.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.shift_code})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="font-display block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input name="password" type="password" value={formData.password} onChange={handleFormChange}
          placeholder="Set initial password"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><p className="font-body text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Staff</h1>
          <p className="font-body text-sm text-gray-400 mt-1">Manage employees and managers</p>
        </div>
        {activeTab === 'employees' && (
          <button onClick={() => setShowAddModal(true)}
            className="font-display bg-primary hover:opacity-90 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
            + Add Employee
          </button>
        )}
      </div>

      {/* Tab switcher — same visual style as the Manager/Self tab at the top */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'employees', label: `Employees (${employees.length})` },
          { key: 'managers',  label: `Managers (${managers.length})`  },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`font-display px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition
              ${activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

      {activeTab === 'employees' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or department..."
            className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="font-display text-left px-6 py-3 font-medium">#</th>
                <th className="font-display text-left px-6 py-3 font-medium">Employee</th>
                <th className="font-display text-left px-6 py-3 font-medium">Department</th>
                <th className="font-display text-left px-6 py-3 font-medium">Designation</th>
                <th className="font-display text-left px-6 py-3 font-medium">Phone</th>
                <th className="font-display text-left px-6 py-3 font-medium">Shift</th>
                <th className="font-display text-left px-6 py-3 font-medium">Status</th>
                <th className="font-display text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" className="font-body text-center py-10 text-sm text-gray-400">No employees found</td></tr>
              ) : (
                filtered.map((emp, index) => (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar emp={emp} size="sm" />
                        <div>
                          <p className="font-display text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{emp.department || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{emp.designation || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{emp.phone}</td>
                    <td className="px-6 py-4">
                      {emp.shift_name ? (
                        <div>
                          <p className="font-display text-sm font-medium text-gray-700">{emp.shift_name}</p>
                          <p className="font-body text-xs text-gray-400">{emp.shift_code}</p>
                        </div>
                      ) : <span className="text-gray-400 text-sm">—</span>}
                    </td>
                    <td className="px-6 py-4"><Badge status={emp.is_active ? 'Active' : 'Inactive'} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedEmployee(emp); setShowViewModal(true) }}
                          className="text-xs text-primary hover:underline font-medium">View</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => openEdit(emp, 'employee')}
                          className="text-xs text-gray-500 hover:underline font-medium">Edit</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => toggleStatus(emp, 'employee')}
                          className={`text-xs font-medium hover:underline ${emp.is_active ? 'text-yellow-500' : 'text-green-600'}`}>
                          {emp.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {/* Delete button hidden — employee records should be preserved for compliance
                        <span className="text-gray-300">|</span>
                        <button onClick={() => { setSelectedEmployee(emp); setShowDeleteModal(true) }}
                          className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                        */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="font-body text-xs text-gray-400">Showing {filtered.length} of {employees.length} employees</p>
        </div>
      </div>
      )} {/* end employees tab */}

      {activeTab === 'managers' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <input value={managerSearch} onChange={e => setManagerSearch(e.target.value)}
            placeholder="Search by name, email or department..."
            className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="font-display text-left px-6 py-3 font-medium">#</th>
                <th className="font-display text-left px-6 py-3 font-medium">Manager</th>
                <th className="font-display text-left px-6 py-3 font-medium">Department</th>
                <th className="font-display text-left px-6 py-3 font-medium">Designation</th>
                <th className="font-display text-left px-6 py-3 font-medium">Phone</th>
                <th className="font-display text-left px-6 py-3 font-medium">Shift</th>
                <th className="font-display text-left px-6 py-3 font-medium">Status</th>
                <th className="font-display text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredManagers.length === 0 ? (
                <tr><td colSpan="8" className="font-body text-center py-10 text-sm text-gray-400">No managers found</td></tr>
              ) : filteredManagers.map((mgr, index) => (
                <tr key={mgr.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar emp={mgr} size="sm" />
                      <div>
                        <p className="font-display text-sm font-medium text-gray-800">{mgr.first_name} {mgr.last_name}</p>
                        <p className="text-xs text-gray-400">{mgr.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{mgr.department || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{mgr.designation || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{mgr.phone || '—'}</td>
                  <td className="px-6 py-4">
                    {mgr.shift_name ? (
                      <div>
                        <p className="font-display text-sm font-medium text-gray-700">{mgr.shift_name}</p>
                        <p className="font-body text-xs text-gray-400">{mgr.shift_code}</p>
                      </div>
                    ) : <span className="text-gray-400 text-sm">—</span>}
                  </td>
                  <td className="px-6 py-4"><Badge status={mgr.is_active ? 'Active' : 'Inactive'} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(mgr, 'manager')}
                        className="text-xs text-primary hover:underline font-medium">Edit</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => toggleStatus(mgr, 'manager')}
                        className={`text-xs font-medium hover:underline ${mgr.is_active ? 'text-yellow-500' : 'text-green-600'}`}>
                        {mgr.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="font-body text-xs text-gray-400">Showing {filteredManagers.length} of {managers.length} managers</p>
        </div>
      </div>
      )} {/* end managers tab */}

      {showAddModal && (
        <Modal title="Add New Employee" onClose={() => setShowAddModal(false)}>
          {formFields}
          <div className="flex gap-3 mt-6">
            <button onClick={handleAdd} className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition">Add Employee</button>
            <button onClick={() => setShowAddModal(false)} className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal >
      )
      }

{showEditModal && selectedEmployee && (
        <Modal title={`Edit — ${selectedEmployee.first_name} ${selectedEmployee.last_name}`} onClose={() => setShowEditModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-display block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input value={editData.first_name} onChange={e => setEditData(p => ({...p, first_name: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="font-display block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input value={editData.last_name} onChange={e => setEditData(p => ({...p, last_name: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={editData.phone} onChange={e => setEditData(p => ({...p, phone: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-display block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input value={editData.department} onChange={e => setEditData(p => ({...p, department: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="font-display block text-sm font-medium text-gray-700 mb-1">Designation</label>
                <input value={editData.designation} onChange={e => setEditData(p => ({...p, designation: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
              <input type="date" value={editData.joining_date} onChange={e => setEditData(p => ({...p, joining_date: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <label className="font-display text-sm font-medium text-gray-700">Status</label>
              <button onClick={() => setEditData(p => ({...p, is_active: !p.is_active}))}
                className={`font-display text-xs font-semibold px-3 py-1.5 rounded-lg border transition
                  ${editData.is_active ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                {editData.is_active ? 'Active' : 'Inactive'} — click to toggle
              </button>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleEditSave}
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

      {showViewModal && selectedEmployee && (
          <Modal title="Employee Details" onClose={() => setShowViewModal(false)}>
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <Avatar emp={selectedEmployee} size="lg" />
                <div>
                  <p className="text-lg font-bold text-gray-800">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                  <p className="font-body text-sm text-gray-400">{selectedEmployee.designation}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['Email', selectedEmployee.email], ['Phone', selectedEmployee.phone], ['Department', selectedEmployee.department], ['Designation', selectedEmployee.designation]].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                    <p className="font-body text-sm text-gray-700">{value || '—'}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Status</p>
                  <Badge status={selectedEmployee.is_active ? 'Active' : 'Inactive'} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Joined</p>
                  <p className="font-body text-sm text-gray-700">{selectedEmployee.joining_date ? new Date(selectedEmployee.joining_date).toLocaleDateString('en-GB') : '—'}</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowViewModal(false)}
              className="w-full mt-6 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Close</button>
          </Modal>
        )
      }

      {
        showDeleteModal && (
          <Modal title="Delete Employee" onClose={() => setShowDeleteModal(false)}>
            <p className="font-body text-sm text-gray-600">Are you sure you want to delete <span className="font-semibold text-gray-800">{selectedEmployee?.first_name} {selectedEmployee?.last_name}</span>?</p>
            <div className="flex gap-3 mt-6">
              <button onClick={handleDelete} className="font-display flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Delete</button>
              <button onClick={() => setShowDeleteModal(false)} className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
            </div>
          </Modal>
        )
      }
    </div>
  )
}

export default Employees