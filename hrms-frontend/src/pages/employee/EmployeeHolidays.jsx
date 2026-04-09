import { useState, useEffect } from 'react'
import { getHolidays } from '../../services/employeeService'

function EmployeeHolidays() {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHolidays()
      .then(res => setHolidays(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Holidays</h1>
        <p className="text-sm text-gray-400 mt-1">Company holidays list</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Holiday</th>
                <th className="text-left px-6 py-3 font-medium">Date</th>
                <th className="text-left px-6 py-3 font-medium">Day</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-10 text-sm text-gray-400">No holidays found</td></tr>
              ) : (
                holidays.map((h, index) => (
                  <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{h.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(h.date).toLocaleDateString('en-GB', { weekday: 'long' })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default EmployeeHolidays