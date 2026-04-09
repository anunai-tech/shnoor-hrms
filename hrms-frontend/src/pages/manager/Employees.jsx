import { useState, useEffect } from 'react'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../services/managerService'

function Badge({ status }) {
  const styles = { 'Active': 'bg-green-50 text-green-600', 'Inactive': 'bg-red-50 text-red-500' }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Employees() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    department: '', designation: '', joining_date: '', password: ''
  })

  useEffect(() => { fetchEmployees() }, [])

  const fetchEmployees = async () => {
    try {
      const res = await getEmployees()
      setEmployees(res.data.data)
    } catch (err) {
      setError('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const filtered = employees.filter(e =>
    `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleAdd = async () => {
    try {
      await createEmployee(formData)
      setShowAddModal(false)
      setFormData({ first_name: '', last_name: '', email: '', phone: '', department: '', designation: '', joining_date: '', password: '' })
      fetchEmployees()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add employee')
    }
  }

  const toggleStatus = async (emp) => {
    try {
      await updateEmployee(emp.id, { ...emp, is_active: !emp.is_active })
      fetchEmployees()
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

  // ✅ JSX variable — no focus bug
  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input name="first_name" value={formData.first_name} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input name="last_name" value={formData.last_name} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input name="email" value={formData.email} onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input name="phone" value={formData.phone} onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input name="department" value={formData.department} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
          <input name="designation" value={formData.designation} onChange={handleFormChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
        <input name="joining_date" type="date" value={formData.joining_date} onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input name="password" type="password" value={formData.password} onChange={handleFormChange}
          placeholder="Set initial password"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your company employees</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
          + Add Employee
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or department..."
            className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Employee</th>
                <th className="text-left px-6 py-3 font-medium">Department</th>
                <th className="text-left px-6 py-3 font-medium">Designation</th>
                <th className="text-left px-6 py-3 font-medium">Phone</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-sm text-gray-400">No employees found</td></tr>
              ) : (
                filtered.map((emp, index) => (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-bold text-xs">{emp.first_name?.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{emp.department || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{emp.designation || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{emp.phone}</td>
                    <td className="px-6 py-4"><Badge status={emp.is_active ? 'Active' : 'Inactive'} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedEmployee(emp); setShowViewModal(true) }}
                          className="text-xs text-blue-600 hover:underline font-medium">View</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => toggleStatus(emp)}
                          className={`text-xs font-medium hover:underline ${emp.is_active ? 'text-yellow-500' : 'text-green-600'}`}>
                          {emp.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => { setSelectedEmployee(emp); setShowDeleteModal(true) }}
                          className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Showing {filtered.length} of {employees.length} employees</p>
        </div>
      </div>

      {showAddModal && (
        <Modal title="Add New Employee" onClose={() => setShowAddModal(false)}>
          {formFields}
          <div className="flex gap-3 mt-6">
            <button onClick={handleAdd} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Add Employee</button>
            <button onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {showViewModal && selectedEmployee && (
        <Modal title="Employee Details" onClose={() => setShowViewModal(false)}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xl">{selectedEmployee.first_name?.charAt(0)}</span>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                <p className="text-sm text-gray-400">{selectedEmployee.designation}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[['Email', selectedEmployee.email], ['Phone', selectedEmployee.phone], ['Department', selectedEmployee.department], ['Designation', selectedEmployee.designation]].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                  <p className="text-sm text-gray-700">{value || '—'}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">Status</p>
                <Badge status={selectedEmployee.is_active ? 'Active' : 'Inactive'} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">Joined</p>
                <p className="text-sm text-gray-700">{selectedEmployee.joining_date ? new Date(selectedEmployee.joining_date).toLocaleDateString('en-GB') : '—'}</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowViewModal(false)}
            className="w-full mt-6 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Close</button>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal title="Delete Employee" onClose={() => setShowDeleteModal(false)}>
          <p className="text-sm text-gray-600">Are you sure you want to delete <span className="font-semibold text-gray-800">{selectedEmployee?.first_name} {selectedEmployee?.last_name}</span>?</p>
          <div className="flex gap-3 mt-6">
            <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Delete</button>
            <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Employees