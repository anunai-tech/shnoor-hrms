import { useState, useEffect } from 'react'
import { getSalaries, upsertSalary, runPayroll, getPayslipsByYear, getPayrollPreview } from '../../services/managerService'
import { usePlan } from '../../context/PlanContext'
import FeatureGateScreen from '../../components/FeatureGateScreen'

// Month names for the Run Payroll modal
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

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

function SalaryManagement() {
  const [salaries, setSalaries] = useState([])
  const [payslipsData, setPayslipsData] = useState([])
  const [previews, setPreviews] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Edit salary modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [formData, setFormData] = useState({ basic: '', hra: '', transport: '', other_allowance: '', deductions: '' })
  const [editError, setEditError] = useState('')

  // Run Payroll state
  const [expandedMonth, setExpandedMonth] = useState(new Date().getMonth() + 1) // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [payrollRunning, setPayrollRunning] = useState(false)
  const [payrollSuccess, setPayrollSuccess] = useState('')
  const [payrollError, setPayrollError] = useState('')

  useEffect(() => { 
    fetchSalaries()
    fetchPayslips(selectedYear)
    setPreviews({}) // Clear previews on year change
  }, [selectedYear])

  useEffect(() => {
    if (expandedMonth && !previews[expandedMonth]) {
      fetchPreview(expandedMonth, selectedYear)
    }
  }, [expandedMonth, selectedYear])

  const fetchPreview = async (month, year) => {
    try {
      const res = await getPayrollPreview(month, year)
      setPreviews(prev => ({ ...prev, [month]: res.data.data }))
    } catch (err) {
      console.error(err)
    }
  }

  const fetchPayslips = async (year) => {
    try {
      const res = await getPayslipsByYear(year)
      setPayslipsData(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }

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
      const res = await runPayroll({ month: expandedMonth, year: selectedYear })
      setPayrollSuccess(res.data.message)
      fetchPayslips(selectedYear)
      fetchSalaries()
    } catch (err) {
      setPayrollError(err.response?.data?.message || 'Failed to run payroll.')
    } finally {
      setPayrollRunning(false)
    }
  }

  const netPay = (Number(formData.basic) + Number(formData.hra) + Number(formData.transport) + Number(formData.other_allowance)) - Number(formData.deductions)

  const editFormFields = (
    <div className="space-y-4">
      {[['basic', 'Basic Salary'], ['hra', 'HRA'], ['transport', 'Transport'], ['other_allowance', 'Other Allowance'], ['deductions', 'Deductions']].map(([name, label]) => (
        <div key={name}>
          <label className="font-display block text-sm font-medium text-gray-700 mb-1">{label} (₹)</label>
          <input name={name} type="number" value={formData[name]}
            onChange={e => setFormData({ ...formData, [e.target.name]: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      ))}
      <div className="bg-amber-50 rounded-lg p-4">
        <p className="font-display text-sm font-medium text-gray-700">Net Pay Preview</p>
        <p className="text-2xl font-bold text-primary mt-1">₹{isNaN(netPay) ? 0 : netPay.toLocaleString('en-IN')}</p>
      </div>
      {editError && <p className="text-red-500 text-sm">{editError}</p>}
    </div>
  )

  const { features, loading: planLoading } = usePlan()
  if (planLoading) return null
  if (!features?.salary_payslips?.enabled) return <FeatureGateScreen featureName="Salary & Payslips" />
  if (loading) return (
    <div className="flex items-center justify-center h-64"><p className="font-body text-gray-400">Loading...</p></div>
  )

  return (
    <div className="space-y-6">
      {features?.salary_payslips?.warning && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="font-body text-sm text-amber-700">
            <span className="font-display font-semibold">Approaching monthly limit — </span>
            {features.salary_payslips.remaining} payslip{features.salary_payslips.remaining !== 1 ? 's' : ''} remaining this month (limit: {features.salary_payslips.limit}).
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Payroll Management</h1>
          <p className="font-body text-sm text-gray-400 mt-1">Manage employee salary structures and run payroll</p>
        </div>
        <div className="flex gap-4 items-center">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." 
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} 
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Months Accordion */}
      <div className="space-y-3">
        {MONTHS.map((monthName, index) => {
          const monthNum = index + 1
          const isExpanded = expandedMonth === monthNum
          const currentDate = new Date()
          const isFutureMonth = selectedYear > currentDate.getFullYear() || (selectedYear === currentDate.getFullYear() && monthNum > currentDate.getMonth() + 1)
          
          // Payroll generation window: Last day of the month to the 7th of next month
          const daysInMonth = new Date(selectedYear, monthNum, 0).getDate()
          const windowStart = new Date(selectedYear, monthNum - 1, daysInMonth, 0, 0, 0)
          const windowEnd = new Date(selectedYear, monthNum, 7, 23, 59, 59)
          
          const isTooEarly = currentDate < windowStart
          const isTooLate = currentDate > windowEnd
          const isWindowOpen = !isTooEarly && !isTooLate
          const buttonDisabled = payrollRunning || !isWindowOpen

          let buttonText = `Generate Payroll for ${monthName}`
          if (payrollRunning) buttonText = 'Generating...'
          else if (isTooEarly) buttonText = 'Available at Month End'
          else if (isTooLate) buttonText = 'Payroll Closed'

          return (
            <div key={monthNum} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button 
                onClick={() => {
                  const newMonth = isExpanded ? null : monthNum
                  setExpandedMonth(newMonth)
                  setPayrollSuccess('')
                  setPayrollError('')
                }}
                className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition"
              >
                <span className="font-display font-semibold text-gray-800">{monthName} {selectedYear}</span>
                <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
              </button>
              
              {isExpanded && (
                <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-display font-semibold text-gray-800">Employee Salaries</h3>
                    <div className="flex items-center gap-3">
                      {payrollError && <span className="text-sm text-red-500 font-medium">{payrollError}</span>}
                      {payrollSuccess && <span className="text-sm text-green-600 font-medium">{payrollSuccess}</span>}
                      <button 
                        onClick={handleRunPayroll}
                        disabled={buttonDisabled}
                        className={`text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition ${!isWindowOpen ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:opacity-90 disabled:opacity-50'}`}
                      >
                        {buttonText}
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto bg-white border border-gray-100 rounded-lg shadow-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                          <th className="font-display text-left px-6 py-3 font-medium">#</th>
                          <th className="font-display text-left px-6 py-3 font-medium">Name</th>
                          <th className="font-display text-left px-6 py-3 font-medium">Role</th>
                          <th className="font-display text-left px-6 py-3 font-medium">Department</th>
                          <th className="font-display text-left px-6 py-3 font-medium">Basic</th>
                          <th className="font-display text-left px-6 py-3 font-medium">Net Pay</th>
                          <th className="font-display text-left px-6 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan="7" className="font-body text-center py-10 text-sm text-gray-400">No records found</td></tr>
                        ) : (
                          filtered.map((emp, index) => {
                            const monthPayslip = payslipsData.find(p => p.user_id === emp.user_id && p.month === monthNum)
                            const monthPreview = (previews[monthNum] || []).find(p => p.user_id === emp.user_id)
                            
                            // 1. Use generated payslip if exists
                            // 2. Otherwise use the live dynamic preview based on attendance
                            // 3. Otherwise fall back to structural fixed data
                            let activeData = monthPayslip || monthPreview || emp
                            
                            let displayBasic = activeData.basic
                            let displayNetPay = activeData.net_pay || 0
                            let displayHoursDeduction = activeData.hours_deduction || 0
                            let displayDeductions = activeData.deductions
                            const isGenerated = !!monthPayslip
                            const isPreview = !monthPayslip && !!monthPreview

                            // For future months, force Net Pay to 0
                            if (isFutureMonth && !isGenerated) {
                              displayNetPay = 0
                            }

                            return (
                            <tr key={emp.user_id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${emp.role === 'manager' ? 'bg-amber-50/30' : ''}`}>
                              <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                              <td className="px-6 py-4">
                                <p className="font-display text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                                <p className="text-xs text-gray-400">{emp.designation}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${emp.role === 'manager' ? 'bg-amber-100 text-primary' : 'bg-gray-100 text-gray-600'}`}>
                                  {emp.role === 'manager' ? 'You (Manager)' : 'Employee'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">{emp.department || '—'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                ₹{Number(displayBasic || 0).toLocaleString('en-IN')}
                                {isGenerated && <span className="ml-2 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Generated</span>}
                                {isPreview && <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Preview</span>}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-800">₹{Number(displayNetPay).toLocaleString('en-IN')}</td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <button onClick={() => { 
                                    setSelectedEmployee({...emp, latest_net_pay: displayNetPay, hours_deduction: displayHoursDeduction, deductions: displayDeductions, basic: displayBasic }); 
                                    setShowViewModal(true) 
                                  }}
                                    className="text-xs text-primary hover:underline font-medium">View</button>
                                  <span className="text-gray-300">|</span>
                                  <button onClick={() => openEdit(emp)}
                                    className="text-xs text-primary hover:underline font-medium">Edit Structure</button>
                                </div>
                              </td>
                            </tr>
                          )})
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* View Salary Modal */}
      {showViewModal && selectedEmployee && (
        <Modal title="Salary Details" onClose={() => setShowViewModal(false)}>
          <div className="space-y-3">
            <p className="font-display text-base font-semibold text-gray-800">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
            <p className="font-body text-sm text-gray-400">{selectedEmployee.designation} — {selectedEmployee.department}</p>
            <div className="space-y-2 pt-2">
              {[['Basic Salary', selectedEmployee.basic], ['HRA', selectedEmployee.hra], ['Transport', selectedEmployee.transport], ['Other Allowance', selectedEmployee.other_allowance]].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-700">₹{Number(val || 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                <span className="text-red-500">Standard Deductions</span>
                <span className="text-red-500">- ₹{Number(selectedEmployee.deductions || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-500">Compromised Working Hours</span>
                <span className="text-red-500">- ₹{Number(selectedEmployee.hours_deduction || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-bold bg-amber-50 rounded-lg px-3 py-2 mt-2">
                <span className="text-amber-700">Net Pay (Latest)</span>
                <span className="text-amber-700">₹{Number(selectedEmployee.latest_net_pay || selectedEmployee.net_pay || 0).toLocaleString('en-IN')}</span>
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
            <button onClick={handleSave} className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition">Save</button>
            <button onClick={() => setShowEditModal(false)} className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>          </div >
        </Modal >
      )
      }

    </div >
  )
}

export default SalaryManagement