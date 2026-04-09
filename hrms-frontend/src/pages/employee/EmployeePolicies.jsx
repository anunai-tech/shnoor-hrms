import { useState, useEffect } from 'react'
import { getPolicies } from '../../services/employeeService'

function EmployeePolicies() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPolicy, setSelectedPolicy] = useState(null)

  useEffect(() => {
    getPolicies()
      .then(res => setPolicies(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Company Policies</h1>
        <p className="text-sm text-gray-400 mt-1">Read your company's policies</p>
      </div>

      {selectedPolicy ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">{selectedPolicy.title}</h2>
            <button onClick={() => setSelectedPolicy(null)} className="text-sm text-blue-600 hover:underline font-medium">← Back</button>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selectedPolicy.content}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {policies.length === 0 ? (
            <div className="col-span-2 text-center py-10 text-sm text-gray-400">No policies published yet</div>
          ) : (
            policies.map(policy => (
              <div key={policy.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition"
                onClick={() => setSelectedPolicy(policy)}>
                <h3 className="text-base font-semibold text-gray-800 mb-2">{policy.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{policy.content}</p>
                <p className="text-xs text-blue-600 mt-4 font-medium">Read full policy →</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default EmployeePolicies