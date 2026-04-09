import { useState, useEffect } from 'react'
import { getMySalary } from '../../services/employeeService'

function EmployeeSalary() {
  const [salary, setSalary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMySalary()
      .then(res => setSalary(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  if (!salary) return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">My Salary</h1></div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
        <p className="text-gray-400 text-sm">No salary details configured yet. Contact your manager.</p>
      </div>
    </div>
  )

  const gross = Number(salary.basic) + Number(salary.hra) + Number(salary.transport) + Number(salary.other_allowance)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Salary</h1>
        <p className="text-sm text-gray-400 mt-1">Your current salary breakdown</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-6 pb-3 border-b border-gray-100">Salary Breakdown</h2>
        <div className="space-y-3 max-w-md">
          {[['Basic Salary', salary.basic],['HRA', salary.hra],['Transport Allowance', salary.transport],['Other Allowance', salary.other_allowance]].map(([label, val]) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">{label}</span>
              <span className="text-sm font-medium text-gray-800">₹{Number(val || 0).toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Gross Salary</span>
            <span className="text-sm font-semibold text-gray-800">₹{Number(gross).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-red-500">Deductions</span>
            <span className="text-sm font-medium text-red-500">- ₹{Number(salary.deductions || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center py-3 bg-blue-50 rounded-lg px-4 mt-2">
            <span className="text-base font-bold text-blue-700">Net Pay</span>
            <span className="text-2xl font-bold text-blue-700">₹{Number(salary.net_pay || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeSalary