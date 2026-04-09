import { useState, useEffect } from 'react'
import { getSalaries, upsertSalary, runPayroll } from '../../services/managerService'

// Month names for the Run Payroll modal
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

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

function SalaryManagement() {
  const [salaries, setSalaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Edit salary modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [formData, setFormData] = useState({ basic: '', hra: '', transport: '', other_allowance: '', deductions: '' })
  const [editError, setEditError] = useState('')

  // Run Payroll modal state
  const [showPayrollModal, setShowPayrollModal] = useState(false)
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1) // 1-12
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear())
  const [payrollRunning, setPayrollRunning] = useState(false)
  const [payrollSuccess, setPayrollSuccess] = useState('')
  const [payrollError, setPayrollError] = useState('')

  useEffect(() => { fetchSalaries() }, [])

  const fetchSalaries = async () => {
    try {
      const res = await getSalaries()
      setSalaries(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = salaries.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.department || '').toLowerCase().includes(search.toLowerCase())
  )

  const openEdit = (emp) => {
    setSelectedEmployee(emp)
    setEditError('')
    setFormData({
      basic: emp.basic || '',
      hra: emp.hra || '',
      transport: emp.transport || '',
      other_allowance: emp.other_allowance || '',
      deductions: emp.deductions || '',
    })
    setShowEditModal(true)
  }

  const handleSave = async () => {
    setEditError('')
    try {
      await upsertSalary({ user_id: selectedEmployee.user_id, ...formData })
      setShowEditModal(false)
      fetchSalaries()
    } catch (err) {
      setEditError('Failed to save salary. Please try again.')
    }
  }

  // Run Payroll handler
  const handleRunPayroll = async () => {
    setPayrollError('')
    setPayrollSuccess('')
    setPayrollRunning(true)
    try {
      const res = await runPayroll({ month: payrollMonth, year: payrollYear })
      setPayrollSuccess(res.data.message)
    } catch (err) {
      setPayrollError(err.response?.data?.message || 'Failed to run payroll.')
    } finally {
      setPayrollRunning(false)
    }
  }

  const netPay = (Number(formData.basic) + Number(formData.hra) + Number(formData.transport) + Number(formData.other_allowance)) - Number(formData.deductions)

  // ✅ JSX variable (not component) — avoids cursor jump bug
  const editFormFields = (
    <div className="space-y-4">
      {[['basic','Basic Salary'],['hra','HRA'],['transport','Transport'],['other_allowance','Other Allowance'],['deductions','Deductions']].map(([name, label]) => (
        <div key={name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label} (₹)</label>
          <input name={name} type="number" value={formData[name]}
            onChange={e => setFormData({...formData, [e.target.name]: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      ))}
      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700">Net Pay Preview</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">₹{isNaN(netPay) ? 0 : netPay.toLocaleString('en-IN')}</p>
      </div>
      {editError && <p className="text-red-500 text-sm">{editError}</p>}
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Salary Management</h1>
          <p className="text-sm text-gray-400 mt-1">Manage employee salary structures and run payroll</p>
        </div>
        <button
          onClick={() => { setPayrollSuccess(''); setPayrollError(''); setShowPayrollModal(true) }}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          Run Payroll
        </button>
      </div>

      {/* Salary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or department..."
            className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Name</th>
                <th className="text-left px-6 py-3 font-medium">Role</th>
                <th className="text-left px-6 py-3 font-medium">Department</th>
                <th className="text-left px-6 py-3 font-medium">Basic</th>
                <th className="text-left px-6 py-3 font-medium">Net Pay</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-sm text-gray-400">No records found</td></tr>
              ) : (
                filtered.map((emp, index) => (
                  <tr key={emp.user_id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${emp.role === 'manager' ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-gray-400">{emp.designation}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${emp.role === 'manager' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        {emp.role === 'manager' ? 'You (Manager)' : 'Employee'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{emp.department || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{Number(emp.basic || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">₹{Number(emp.net_pay || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedEmployee(emp); setShowViewModal(true) }}
                          className="text-xs text-blue-600 hover:underline font-medium">View</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => openEdit(emp)}
                          className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Salary Modal */}
      {showViewModal && selectedEmployee && (
        <Modal title="Salary Details" onClose={() => setShowViewModal(false)}>
          <div className="space-y-3">
            <p className="text-base font-semibold text-gray-800">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
            <p className="text-sm text-gray-400">{selectedEmployee.designation} — {selectedEmployee.department}</p>
            <div className="space-y-2 pt-2">
              {[['Basic Salary', selectedEmployee.basic],['HRA', selectedEmployee.hra],['Transport', selectedEmployee.transport],['Other Allowance', selectedEmployee.other_allowance]].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-700">₹{Number(val || 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                <span className="text-red-500">Deductions</span>
                <span className="text-red-500">- ₹{Number(selectedEmployee.deductions || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-bold bg-blue-50 rounded-lg px-3 py-2">
                <span className="text-blue-700">Net Pay</span>
                <span className="text-blue-700">₹{Number(selectedEmployee.net_pay || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setShowViewModal(false)}
            className="w-full mt-6 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Close</button>
        </Modal>
      )}

      {/* Edit Salary Modal */}
      {showEditModal && selectedEmployee && (
        <Modal title={`Edit Salary — ${selectedEmployee.first_name} ${selectedEmployee.last_name}`} onClose={() => setShowEditModal(false)}>
          {editFormFields}
          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Save</button>
            <button onClick={() => setShowEditModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Run Payroll Modal */}
      {showPayrollModal && (
        <Modal title="Run Payroll" onClose={() => setShowPayrollModal(false)}>
          <div className="space-y-5">
            <p className="text-sm text-gray-500">
              This will generate payslips for <strong>all employees and yourself</strong> based on their current salary structure for the selected month.
              If payslips already exist for this month, they will be updated.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select value={payrollMonth} onChange={e => setPayrollMonth(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {MONTHS.map((m, i) => (
                    <option key={i+1} value={i+1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select value={payrollYear} onChange={e => setPayrollYear(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {payrollError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{payrollError}</div>}
            {payrollSuccess && <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3">✓ {payrollSuccess}</div>}

            <div className="flex gap-3">
              <button onClick={handleRunPayroll} disabled={payrollRunning}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-semibold py-2.5 rounded-lg transition">
                {payrollRunning ? 'Generating...' : `Generate Payslips for ${MONTHS[payrollMonth-1]} ${payrollYear}`}
              </button>
              <button onClick={() => setShowPayrollModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Close</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}

export default SalaryManagement